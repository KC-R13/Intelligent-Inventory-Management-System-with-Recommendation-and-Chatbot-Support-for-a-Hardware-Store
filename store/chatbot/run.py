import multiprocessing
import os
import sys
from pathlib import Path

from store import chatbot

chatbot_path = Path(chatbot.__file__).parent


def run_rasa(args):
    os.chdir(chatbot_path.parent.parent)
    sys.argv = args

    from rasa.__main__ import main as rasa_main
    rasa_main()


if __name__ == '__main__':
    actions_argv = [
        sys.argv[0], 'run', 'actions',
        '--actions', 'store.chatbot.actions',
    ]
    server_argv = [
        sys.argv[0], 'run',
        '--enable-api',
        '--cors', '*',
        '--endpoints', str(chatbot_path / 'endpoints.yml'),
    ]

    actions_process = multiprocessing.Process(
        target=run_rasa,
        args=(actions_argv,),
        name='rasa-actions',
    )
    server_process = multiprocessing.Process(
        target=run_rasa,
        args=(server_argv,),
        name='rasa-server',
    )

    actions_process.start()
    server_process.start()

    try:
        actions_process.join()
        server_process.join()
    except KeyboardInterrupt:
        print("\nShutting down...")
        actions_process.terminate()
        server_process.terminate()
        actions_process.join()
        server_process.join()
