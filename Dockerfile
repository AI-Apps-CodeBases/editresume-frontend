FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    libgdk-pixbuf-2.0-0 \
    libcairo2 \
    libpangocairo-1.0-0 \
    build-essential \
    gcc \
    g++ \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

