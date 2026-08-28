FROM python:3.11-slim

WORKDIR /app

ENV AI_SERVICE_INTERNAL_TOKEN=dev-internal-token

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]