import * as vscode from 'vscode';

type Style = 'snake' | 'camel' | 'pascal' | 'kebab' | 'upper_snake';

function splitTokens(s: string): string[] {
  // 1) заменяем разделители на пробел
  const replaced = s.replace(/[_\-\s]+/g, ' ');
  // 2) вставляем пробелы на границах регистра, чтобы FooBARBaz -> Foo BAR Baz
  const withBoundaries = replaced
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, '$1 $2');
  // 3) в токены (нижний регистр)
  return withBoundaries.trim().split(/\s+/).map(t => t.toLowerCase());
}

function joinTokens(tokens: string[], style: Style): string {
  switch (style) {
    case 'snake': return tokens.join('_');
    case 'kebab': return tokens.join('-');
    case 'upper_snake': return tokens.join('_').toUpperCase();
    case 'camel': return tokens.map((t, i) => i ? t.charAt(0).toUpperCase() + t.slice(1) : t).join('');
    case 'pascal': return tokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('');
  }
}

function detectStyle(s: string): Style | undefined {
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(s)) return 'snake';
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(s)) return 'kebab';
  if (/^[A-Z0-9_]+$/.test(s) && s.includes('_')) return 'upper_snake';
  if (/^[a-z][A-Za-z0-9]*$/.test(s) && /[A-Z]/.test(s)) return 'camel';
  if (/^[A-Z][A-Za-z0-9]*$/.test(s) && /[a-z]/.test(s)) return 'pascal';
  return undefined;
}

const order: Style[] = ['snake', 'camel', 'pascal', 'kebab', 'upper_snake'];

async function transform(editor: vscode.TextEditor, style?: Style, toggle = false) {
  const doc = editor.document;
  const edits: { range: vscode.Range; text: string }[] = [];

  for (const sel of editor.selections) {
    // если выделения нет — берём слово под курсором
    const range = sel.isEmpty ? (doc.getWordRangeAtPosition(sel.active) ?? sel) : sel;
    const text = doc.getText(range);
    if (!text) continue;

    const tokens = splitTokens(text);
    if (tokens.length === 0) continue;

    let target = style;
    if (toggle) {
      const cur = detectStyle(text);
      const idx = cur ? order.indexOf(cur) : -1;
      target = order[(idx + 1 + order.length) % order.length];
    }
    if (!target) continue;

    edits.push({ range, text: joinTokens(tokens, target) });
  }

  if (edits.length > 0) {
    await editor.edit(builder => {
      for (const e of edits) builder.replace(e.range, e.text);
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const reg = (cmd: string, fn: () => Thenable<void> | void) =>
    context.subscriptions.push(vscode.commands.registerCommand(cmd, fn));

  reg('casebuddy.toggle', () => {
    const ed = vscode.window.activeTextEditor; if (!ed) return;
    return transform(ed, undefined, true);
  });
  reg('casebuddy.toSnake', () => {
    const ed = vscode.window.activeTextEditor; if (!ed) return;
    return transform(ed, 'snake');
  });
  reg('casebuddy.toCamel', () => {
    const ed = vscode.window.activeTextEditor; if (!ed) return;
    return transform(ed, 'camel');
  });
  reg('casebuddy.toPascal', () => {
    const ed = vscode.window.activeTextEditor; if (!ed) return;
    return transform(ed, 'pascal');
  });
  reg('casebuddy.toKebab', () => {
    const ed = vscode.window.activeTextEditor; if (!ed) return;
    return transform(ed, 'kebab');
  });
  reg('casebuddy.toUpperSnake', () => {
    const ed = vscode.window.activeTextEditor; if (!ed) return;
    return transform(ed, 'upper_snake');
  });
}

export function deactivate() {}
