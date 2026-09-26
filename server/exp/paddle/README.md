docker build -t my-paddleocr .


cd to script file then

docker run --rm -it \
  -v "$(pwd):/app" \
  my-paddleocr \
  bash