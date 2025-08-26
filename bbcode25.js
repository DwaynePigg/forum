'use strict';

const ENTITIES = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
};

function htmlEscape(content) {
	return content.replaceAll(/[<>]|&(?!#?[a-z0-9]+;)/gi, c => ENTITIES[c]);
}

function trimLeadingNewline(s) {
	if (s.startsWith('\r\n')) {
		return s.slice(2);
	}
	if (s.startsWith('\n')) {
		return s.slice(1);
	}
	return s;
}

function startsWithNewline(s) {
	return s.startsWith('\n') || s.startsWith('\r\n');
}

const NEXT_TAG = /\[(\/?)([a-z]+)(?:=([^\]]+))?\]/i;
const ROOT = new Tag('ROOT', (a => a), parseInner);

function parseBBCode(content) {
	let unclosed = [];
	return {
		html: parseInner(htmlEscape(content.trimEnd()), ROOT, unclosed)[0],
		unclosed: unclosed,
	};
}

/**
 * Returns a "tuple" containing:
 * (0) the content of the open tag
 * (1) the remaining unparsed text
 */
function parseInner(content, openTag, unclosed) {
	let match = NEXT_TAG.exec(content);
	if (match) {
		let [full, isEndTag, tagName, param] = match;
		let before = content.slice(0, match.index);
		let after = content.slice(match.index + full.length);
		let tag = TAG_LOOKUP[tagName.toLowerCase()];
		if (tag) {
			if (isEndTag) {
				if (tag === openTag) {
					return [before, after];
				}
			} else {
				let inner, outer, remainder;
				[inner, remainder] = tag.parse(after, tag, unclosed, param);
				[outer, remainder] = openTag.parse(remainder, openTag, unclosed);
				let blockMode = startsWithNewline(inner)
				if (blockMode) {
					inner = trimLeadingNewline(inner);
					outer = trimLeadingNewline(outer);
				}
				return [before + tag.format(inner, param, blockMode) + outer, remainder];
			}
		}
		let [inner, remainder] = parseInner(after, openTag, unclosed);
		return [before + full + inner, remainder];
	}
	if (openTag != ROOT) {
		unclosed.push(openTag.name);
	}
	return [content, ''];
}

function parseInnerStrict(content, tagName, unclosed) {
	let closeTag = `[/${tagName}]`;
	let match = content.toLowerCase().indexOf(closeTag);
	if (match != -1) {
		return [content.slice(0, match), content.slice(match + closeTag.length)];
	}
	unclosed.push(tagName);
	return [content, ''];
}

const TAG_LOOKUP = function() {
	let tags = [
		new StyleTag('b'),
		new StyleTag('i'),
		new StyleTag('u'),
		new StyleTag('s'),
		new StyleTag('sup'),
		new StyleTag('sub'),
		
		new AlignTag('left'),
		new AlignTag('right'),
		new AlignTag('center'),
		new AlignTag('justify'),
		
		new Tag('font', applyFont),
		new Tag('size', applySize),
		new Tag('color', applyColor),
		new Tag('quote', applyQuote),
		new Tag('url', applyUrl, parseUrl),
		new Tag('img', applyImg, parseImg),
		new Tag('code', applyCode, parseCode),
		new Tag('highlight', applyHighlight),
		
		new Tag('list', applyList),
		new Tag('li', applyListItem),
	];

	let lookup = {};
	for (let tag of tags) {
		lookup[tag.name] = tag;
	}
	return lookup;
}();

function Tag(name, formatter, parser=parseInner) {
	this.name = name;
	this.format = formatter;
	this.parse = parser;
}

function StyleTag(name) {
	Tag.call(this, name, function(content) {
		return `<${name}>${content}</${name}>`
	});
}

function AlignTag(align) {
	Tag.call(this, align, function(content) {
		return `<div style="text-align: ${align};">${content}</div>`	
	});
}

function applyFont(content, param) {
	param ??= 'Impact,sans-serif';
	return `<span style="font-family: ${param};">${content}</span>`;
}

function applyColor(content, param) {
	param ??= 'red';
	return `<span style="color: ${param};">${content}</span>`;
}

function applyHighlight(content, param, blockMode) {
	param ??= 'yellow';
	let tagName = blockMode ? 'div' : 'span';
	return `<${tagName} style="background-color: ${param};">${content}</${tagName}>`;
}

function getSizePt(param) {
	if (param) {
		if (!isNaN(param)) {
			return parseInt(param);
		}
		switch (param.toLowerCase()) {
			case 'small':
			return 8;
			case 'large':
			return 24;
		}
	}
	return 14;
}

/*
 * Spans aren't allowed to change line-height, so you can change the font-size
 * but not the space between lines, which looks weird. There's no great way
 * around this (although quirks mode does exactly what I want), so I've 
 * introduced block mode, where a newline immediately after an open tag makes
 * certain styles into blocks.
 */
function applySize(content, param, blockMode) {
	let tagName = blockMode ? 'div' : 'span';
	return `<${tagName} style="font-size: ${getSizePt(param)}pt;">${content}</${tagName}>`;
}

function parseUrl(content, url, unclosed, param) {
	return param ? parseInner(content, url, unclosed) : parseInnerStrict(content, 'url', unclosed)
}

function applyUrl(content, param) {
	let href = (param ?? content).trim();
	if (href.toLowerCase().startsWith('javascript')) {
		href = "javascript:alert('You have been denied!');";
	}
	return `<a href="${href}">${content}</a>`;
}

function parseImg(content, _, unclosed) {
	return parseInnerStrict(content, 'img', unclosed)
}

function preprocessImg(content) {
	return content;
}

function applyImg(content, param) {
	content = preprocessImg(content);
	if (param) {
		let height = /^(\d+)h?$/.exec(param);
		if (height) {
			return `<img height="${height[1]}" src="${content}">`;
		}
		let width = /^(\d+)w$/.exec(param);
		if (width) {
			return `<img width="${width[1]}" src="${content}">`;
		}
		let widthHeight = /^(\d+)x(\d+)$/.exec(param) ?? /^(\d+)w(\d+)h$/.exec(param);
		if (widthHeight) {
			return `<img width="${widthHeight[1]}" height="${widthHeight[2]}" src="${content}">`;
		}
	}
	return `<img src="${content}">`;
}

function applyQuote(content) {
	return `<blockquote>${content}</blockquote>`;
}

function applyList(content, param) {
	if (param) {
		let start = parseInt(param);
		if (!isNaN(start) && start > 1) {
			return `<ol type="1" start="${param}">${content}</ol>`;
		}
		return `<ol type="${param}">${content}</ol>`;
	}
	return `<ul>${content}</ul>`;
}

function applyListItem(content, param) {
	return `<li>${content}</li>`
}

function applyCode(content) {
	return `<pre>${content}</pre>`;
}

function parseCode(content, _, unclosed) {
	return parseInnerStrict(content, 'code', unclosed)
}
