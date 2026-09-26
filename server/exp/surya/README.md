docker build -t my-surya .

cd to script file then

docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  my-surya \
  bash


surya_ocr image.jpg --langs ar,en