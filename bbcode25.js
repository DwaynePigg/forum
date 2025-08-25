'use strict';

const ENTITIES = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
};

function htmlEscape(content) {
	return content.replaceAll(/[<>]|&(?![a-z0-9]+;)/g, c => ENTITIES[c]);
}

function trimNewline(content) {
	return content.replace(/^\r?\n/, '');
}

const NEXT_TAG = /\[(\/?)([a-z]+)(?:=([^\]\s]+))?\]/i;

function parseBBCode(content) {
	let unclosed = [];
	return {
		html: parseInner(htmlEscape(content.trimEnd()), null, unclosed)[0],
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
		let left = content.substring(0, match.index);
		let right = content.substring(match.index + full.length);
		let tag = TAG_LOOKUP[tagName.toLowerCase()];
		if (tag) {
			if (isEndTag) {
				if (tag === openTag) {
					return [left, right];
				}
			} else {
				let inner, outer, remainder;
				[inner, remainder] = tag.parse(right, tag, unclosed);
				[outer, remainder] = parseInner(remainder, openTag, unclosed);
				return [tag.formatOuter(left, inner, outer, param), remainder];
			}
		}
		let [inner, remainder] = parseInner(right, openTag, unclosed);
		// `<span class="error">${full}</span>`
		// TODO: if we're not going to do anything here, we should skip non-matching tags
		// (which is basically what we're doing, but we could do it non-recursively)
		return [left + full + inner, remainder];
	}
	if (openTag) {
		// content += `<span class="missing">[/${openTag.name}]</span>`
		unclosed.push(openTag.name);
	}
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
		new BasicTag('color', applyColor),
		new BasicTag('font',  applyFont),
		new BasicTag('url',   applyUrl),
		new BasicTag('img',   applyImg),
		new BlockTag('quote', applyQuote),
		new BlockTag('list',  applyList),
		new BlockTag('code',  applyCode, parseCode),
		new      Tag('size',  undefined, applySize),
		// we're doing all this OO stuff just because we want special handling for font-size!
	];

	let lookup = {};
	for (let tag of tags) {
		lookup[tag.name] = tag;
	}
	return lookup;
}();

function formatOuter(before, content, after, param) {
	return before + this.format(content, param) + after;
}

function formatOuterBlock(before, content, after, param) {
	return formatOuter.call(this, before, trimNewline(content), trimNewline(after), param);
}

function Tag(name, parser=parseInner, outerFormatter=formatOuter) {
	this.name = name;
	this.parse = parser;
	this.formatOuter = outerFormatter;
}

function BasicTag(name, formatter) {
	Tag.call(this, name);
	this.format = formatter;
}

function BlockTag(name, formatter, parser) {
	Tag.call(this, name, parser, formatOuterBlock);
	this.format = formatter;
}

function StyleTag(name) {
	BasicTag.call(this, name, function(content) {
		return `<${name}>${content}</${name}>`
	});
}

function AlignTag(align) {
	BlockTag.call(this, align, function(content) {
		return `<div style="text-align: ${align};">${content}</div>`	
	});
}

function applyFont(content, param) {
	param ??= 'sans-serif';
	return `<span style="font-family: ${param};">${content}</span>`;
}

function applyColor(content, param) {
	param ??= 'black';
	return `<span style="color: ${param};">${content}</span>`;
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
 * around this (although quirks mode does exactly what I want), so we'll just
 * make any [font] blocks into divs if they contain newlines.
 */
function applySize(before, content, after, param) {
	let tagName;
	if (content.includes('\n')) {
		tagName = 'div';
		content = trimNewline(content)
		after = trimNewline(after);
	} else {
		tagName = 'span';
	}
	return `${before}<${tagName} style="font-size: ${getSizePt(param)}pt;">${content}</${tagName}>${after}`;
}

function applyUrl(content, param) {
	return `<a href="${param ?? content}">${content}</a>`;
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

const LIST_ITEMS = /\[\*\](.*?)(?:$|(?=\[\*\]))/gs

function applyList(content, param) {
	content = content.trim();
	let listItems;
	// okay, lists break a lot of formatting. I see why forum.dominionstrategy uses explicit [li] tags...
	if (content.includes('[*]')) {
		listItems = content.replaceAll(LIST_ITEMS, (_, g1) => `<li>${g1.trim()}</li>`);
	} else {
		listItems = content.split(/\r?\n/).map(line => line.trim()).filter(x => x).map(line => `<li>${line}</li>`).join('');
	}
	if (param) {
		if (!isNaN(param) && start > 1) {
			return `<ol type="1" start="${param}">${listItems}</ol>`;
		}
		return `<ol type="${param}">${listItems}</ol>`;
	}
	return `<ul>${listItems}</ul>`;
}

function applyCode(content) {
	return `<pre>${content}</pre>`;
}

function parseCode(content, _, unclosed) {
	let closeTag = '[/code]';
	let match = content.indexOf(closeTag);
	if (match != -1) {
		return [content.substring(0, match), content.substring(match + closeTag.length)];
	}
	unclosed.push('code');
	return [content, ''];
}
