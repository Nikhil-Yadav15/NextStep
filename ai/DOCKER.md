# AI Service Docker Guide

## Build image

```bash
docker build -t nextstep-ai .
```

## Run container

```bash
docker run --rm -p 5001:5001 --name nextstep-ai nextstep-ai
```

The Flask API will be available at:

- `http://localhost:5001/health`

## Run with Docker Compose

```bash
docker compose up --build
```

## Notes

- The app tries to load `best_model.h5` from the `ai` folder. If missing, it still starts but body-language model falls back gracefully.
- Hugging Face models are downloaded on first startup, so initial boot may take time.
- Webcam passthrough in Docker varies by host OS. If webcam feed is needed, running natively is often simpler on Windows.
