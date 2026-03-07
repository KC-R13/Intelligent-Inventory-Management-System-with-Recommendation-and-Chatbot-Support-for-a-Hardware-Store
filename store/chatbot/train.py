import sys
from pathlib import Path

from store import chatbot
from store.general.paths import MODELS_DIR

if __name__ == '__main__':
    chatbot_path = Path(chatbot.__file__).parent

    sys.argv.append('train')
    sys.argv.extend(['--config', str(chatbot_path / 'config.yml')])
    sys.argv.extend(['--domain', str(chatbot_path / 'domain.yml')])
    sys.argv.extend(['--data', str(chatbot_path / 'data')])
    sys.argv.extend(['--out', str(MODELS_DIR)])

    from rasa.__main__ import main as rasa_main
    rasa_main()
