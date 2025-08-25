'use strict';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

function updatePost() {
	let parsed = parseBBCode(editor.value);
	let html = parsed.html;
	preview.innerHTML = parsed.html;
}

function noSelection() {
	return editor.selectionStart == editor.selectionEnd;
}

function writeText(text, selected=false) {
	let start = editor.selectionStart;
	editor.setRangeText(text);
	if (selected) {	
		editor.setSelectionRange(start, start + text.length);
	} else {
		let pos = start + text.length;
		editor.setSelectionRange(pos, pos);
	}
	updatePost();
	editor.focus();
}

function currentUnclosed() {
	return parseBBCode(editor.value.substring(0, editor.selectionStart)).unclosed[0];
}

const OPEN_TAG = /^\[([a-z]+)(?:=[^\]\s]+)?\]/i;

function insertTag(tagName, param) {
	let open = param ? `[${tagName}=${param}]` : `[${tagName}]`;
	let close = `[/${tagName}]`;
	if (noSelection()) {
		writeText(currentUnclosed() == tagName ? close : open);
	} else {
		let selected = editor.value.substring(editor.selectionStart, editor.selectionEnd);
		let match = OPEN_TAG.exec(selected);
		if (match && match[1] == tagName && selected.endsWith(close)) {
			editor.setRangeText(selected.substring(match[0].length, selected.length - close.length));
		} else {
			editor.setRangeText(open + selected + close);
		}
		updatePost();
	}
	if (event.type == 'click') {
		editor.focus();
	}
}

function autoCloseTag() {
	if (noSelection()) {
		let unclosed = currentUnclosed();
		if (unclosed) {
			writeText(`[/${unclosed}]`);
		}
	}
}

function shortcut(e) {
	if (e.key == 'Tab') {
		autoCloseTag();
		event.preventDefault();
		return;
	}
	if (!e.ctrlKey) return;
	let key = e.key.toLowerCase();
	if (e.shiftKey) {
		switch (key) {
			case '+': insertTag('sup'); break;
			case '_': insertTag('sub'); break;
			case 'i': insertTag('img'); break;
			case 'u': insertTag('url'); break;
			case '|': insertTag('justify'); break;
			case 'c': insertTag('color', randColor()); break;
			case 'f': insertTag('font',  randFont());  break;
			case 's': insertTag('size',  randSize());  break;
			default: return;
		}
	} else {
		switch (key) {
			case ' ': autoCloseTag(); break;
			case 'b':
			case 'i':
			case 'u':
			case 's':
			insertTag(key); break;
			case '[':  insertTag('left');   break;
			case ']':  insertTag('right');  break;
			case '\\': insertTag('center'); break;
			case 'l':  insertTag('list');   break;
			case 'q':  insertTag('quote');  break;
			case '.':
			// case 'f': insertFreedomOfSpeech(); break;
			if (noSelection()) writeText('[*]'); break;
			default: return;
		}
	}
	event.preventDefault();
}

function randInt(start, end) {
	return Math.floor(Math.random() * (end - start)) + start;
}

function randChoice(arr) {
	return arr[randInt(0, arr.length)];
}

const COLORS = [
	'red', 'maroon', 'yellow', 'olive', 'lime', 'green', 'aqua', 'teal', 
	'blue', 'navy', 'fuchsia', 'purple', 'indigo', 'orange', 'gold', 'pink', 
	'silver', 'gray', 'HotPink', 'SaddleBrown', 'Tan',
];
const FONTS =  ['serif', 'cursive', 'fantasy', 'monospace'];
const SIZES =  ['small', 'large'];

function randColor() {
	if (Math.random() < 0.05) {
		return '#' + randInt(0, 0x1000000).toString(16).padStart(6, '0');
	}
	return COLORS[randInt(0, COLORS.length)];
}

function randFont() {
	return randChoice(FONTS);
}

function randSize() {
	let i = randInt(0, SIZES.length + 2);
	if (i < SIZES.length) {
		return SIZES[i]
	}
	return randInt(6, 60);
}

updatePost();
