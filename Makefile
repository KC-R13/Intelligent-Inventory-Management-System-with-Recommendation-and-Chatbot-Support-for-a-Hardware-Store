chatbot-train:
	cd store/chatbot && uv run rasa train

chatbot-run:
	cmd /c start cmd /k "cd store/chatbot && uv run rasa run actions"
	cmd /c start cmd /k "cd store/chatbot && uv run rasa run --enable-api --cors \"*\""
	cmd /c start cmd /k "python -m http.server 8080"
	timeout /t 3 /nobreak
	cmd /c start http://localhost:8080/store/chatbot/simple_interface.html