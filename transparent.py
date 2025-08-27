if __name__ != '__main__':
	raise ImportError()

from PIL import Image
import argparse
	
parser = argparse.ArgumentParser()
parser.add_argument('input')
parser.add_argument('output')
parser.add_argument('-t', '--threshold', type=int, default=255)
args = parser.parse_args()

img = Image.open(args.input).convert("RGBA")
new_data = [
	(255, 255, 255, 0)
	if all(c >= args.threshold for c in item[:3])
	else item
	for item in img.getdata()
]
img.putdata(new_data)
img.save(args.output, "PNG")
