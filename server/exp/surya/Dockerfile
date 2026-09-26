FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git \
        build-essential \
        cmake \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git /tmp/llama.cpp && \
    cmake -S /tmp/llama.cpp -B /tmp/llama.cpp/build \
        -DCMAKE_BUILD_TYPE=Release \
        -DGGML_NATIVE=OFF && \
    cmake --build /tmp/llama.cpp/build \
        --target llama-server \
        -j2 && \
    cp /tmp/llama.cpp/build/bin/llama-server /usr/local/bin/llama-server && \
    rm -rf /tmp/llama.cpp

RUN pip install --no-cache-dir surya-ocr