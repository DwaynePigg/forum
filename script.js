'use strict';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

function updatePost() {
	let parsed = parseBBCode(editor.value);
	let html = parsed.html;
	preview.innerHTML = parsed.html;
	preview.hidden = !preview.innerText.trim();
}

function selectedText() {
	return editor.value.slice(editor.selectionStart, editor.selectionEnd);
}

function writeText(text) {
	let start = editor.selectionStart;
	editor.setRangeText(text);
	let pos = start + text.length;
	editor.setSelectionRange(pos, pos);
}

function currentUnclosed() {
	return parseBBCode(editor.value.slice(0, editor.selectionStart)).unclosed[0];
}

const OPEN_TAG = /^\[([a-z]+)(?:=[^\]\s]+)?\]/i;

function insertTag(tagName, param) {
	let open = param == undefined ? `[${tagName}]` : `[${tagName}=${param}]`;
	let close = `[/${tagName}]`;
	let selected = selectedText();
	if (selected) {
		let match = OPEN_TAG.exec(selected);
		if (match && match[1] == tagName && selected.endsWith(close)) {
			editor.setRangeText(selected.slice(match[0].length, -close.length));
		} else {
			editor.setRangeText(open + selected + close);
		}
	} else {
		writeText(currentUnclosed() == tagName ? close : open);
	}
	updatePost();
	if (event.type == 'click') {
		editor.focus();
	}
}

function insertList(param) {
	let listTag = param == undefined ? '[list]' : `[list=${param}]`;
	let selected = selectedText();
	let listItems;
	if (selected) {
		let match = OPEN_TAG.exec(selected);
		if (match && match[1] == 'list' && selected.endsWith('[/list]')) {
			editor.setRangeText(selected
				.slice(match[0].length, -7)
				.trim()
				.split(/\r?\n/)
				.map(line => line.startsWith('[li]') && line.endsWith('[/li]') ? line.slice(4, -5) : line)
				.join('\r\n'));
		} else {			
			editor.setRangeText(`${listTag}\r\n${selected
				.trim()
				.split(/\r?\n/)
				.map(line => line.trim() ? `[li]${line}[/li]` : line)
				.join('\r\n')}\r\n[/list]`);
		}
	} else {
		writeText(`${listTag}\r\n[li]Lions[/li]\r\n[li]Tigers[/li]\r\n[li]Bears[/li]\r\n[/list]`);
	}
	updatePost();
	if (event.type == 'click') {
		editor.focus();
	}
}

function autoCloseTag() {
	if (!selectedText()) {
		let unclosed = currentUnclosed();
		if (unclosed) {
			writeText(`[/${unclosed}]`);
			updatePost();
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
			case 'i': insertTag('img'); break;
			case 'u': insertTag('url'); break;
			case '|': insertTag('justify'); break;
			case 'c': insertTag('color', randColor()); break;
			case 'f': insertTag('font',  randFont());  break;
			case 's': insertTag('size',  randSize());  break;
			case 'l': insertList();   break;
			case '!': insertList(1);   break;
			default: return;
		}
	} else {
		switch (key) {
			case 'b':
			case 'i':
			case 'u':
			case 's':  insertTag(key);      break;
			case '[':  insertTag('left');   break;
			case ']':  insertTag('right');  break;
			case '\\': insertTag('center'); break;
			case 'q':  insertTag('quote');  break;
			case '=':  insertTag('sup');    break;
			case '-':  insertTag('sub');    break;
			case '`':  insertTag('code');   break;
			case 'l':  insertTag('list');   break;
			case '1':  insertTag('list', 1);break;
			case '.':  insertTag('li');     break;
			case 'h':  insertTag('highlight', randColor());  break;
			case ' ':  autoCloseTag(); break;
			// case 'f': insertFreedomOfSpeech(); break;
			// if (noSelection()) writeText('[*]'); break;
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
		return `#${randInt(0, 0x1000000).toString(16).padStart(6, '0')}`;
	}
	return randChoice(COLORS);
}

function randFont() {
	return randChoice(FONTS);
}

function randSize() {
	if (Math.random() < 0.5) {
		return randInt(6, 60);
	}
	return randChoice(SIZES);
}

updatePost();
