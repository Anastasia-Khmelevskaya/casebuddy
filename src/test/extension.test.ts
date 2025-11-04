import * as assert from 'assert';
import * as vscode from 'vscode';

async function withTempDoc(
  content: string,
  language = 'plaintext'
): Promise<{ editor: vscode.TextEditor; doc: vscode.TextDocument }> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  const editor = await vscode.window.showTextDocument(doc);
  return { editor, doc };
}

function pos(doc: vscode.TextDocument, index: number): vscode.Position {
  const text = doc.getText();
  let line = 0, col = 0;
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') { line++; col = 0; }
    else { col++; }
  }
  return new vscode.Position(line, col);
}

function selectWord(editor: vscode.TextEditor, doc: vscode.TextDocument, word: string) {
  const start = doc.getText().indexOf(word);
  if (start < 0) { throw new Error(`Word not found: ${word}`); }
  const end = start + word.length;
  editor.selections = [new vscode.Selection(pos(doc, start), pos(doc, end))];
}

suite('CaseBuddy: commands', () => {
  test('toSnake converts camelCase → snake_case', async () => {
    const { editor, doc } = await withTempDoc('const a = myVarName;\n');
    selectWord(editor, doc, 'myVarName');

    await vscode.commands.executeCommand('casebuddy.toSnake');

    const text = doc.getText();
    assert.ok(text.includes('my_var_name'), `Expected snake_case, got:\n${text}`);
  });

  test('toCamel converts snake_case → camelCase', async () => {
    const { editor, doc } = await withTempDoc('let x = my_var_name;\n');
    selectWord(editor, doc, 'my_var_name');

    await vscode.commands.executeCommand('casebuddy.toCamel');

    const text = doc.getText();
    assert.ok(text.includes('myVarName'), `Expected camelCase, got:\n${text}`);
  });

  test('toPascal converts snake_case → PascalCase', async () => {
    const { editor, doc } = await withTempDoc('const Cls = my_var_name;\n');
    selectWord(editor, doc, 'my_var_name');

    await vscode.commands.executeCommand('casebuddy.toPascal');

    const text = doc.getText();
    assert.ok(text.includes('MyVarName'), `Expected PascalCase, got:\n${text}`);
  });

  test('toKebab converts snake_case → kebab-case', async () => {
    const { editor, doc } = await withTempDoc('use it: my_var_name;\n');
    selectWord(editor, doc, 'my_var_name');

    await vscode.commands.executeCommand('casebuddy.toKebab');

    const text = doc.getText();
    assert.ok(text.includes('my-var-name'), `Expected kebab-case, got:\n${text}`);
  });

  test('toUpperSnake converts camelCase → UPPER_SNAKE', async () => {
    const { editor, doc } = await withTempDoc('const CONST = myVarName;\n');
    selectWord(editor, doc, 'myVarName');

    await vscode.commands.executeCommand('casebuddy.toUpperSnake');

    const text = doc.getText();
    assert.ok(text.includes('MY_VAR_NAME'), `Expected UPPER_SNAKE, got:\n${text}`);
  });

  test('toggle cycles through styles (snake → camel → pascal → kebab → upper_snake → snake)', async () => {
    const { editor, doc } = await withTempDoc('v = my_var_name;\n');
    selectWord(editor, doc, 'my_var_name');

    await vscode.commands.executeCommand('casebuddy.toggle'); // snake -> camel
    assert.ok(doc.getText().includes('myVarName'), 'Step 1 (camel) failed');

    selectWord(editor, doc, 'myVarName');
    await vscode.commands.executeCommand('casebuddy.toggle'); // camel -> pascal
    assert.ok(doc.getText().includes('MyVarName'), 'Step 2 (pascal) failed');

    selectWord(editor, doc, 'MyVarName');
    await vscode.commands.executeCommand('casebuddy.toggle'); // pascal -> kebab
    assert.ok(doc.getText().includes('my-var-name'), 'Step 3 (kebab) failed');

    selectWord(editor, doc, 'my-var-name');
    await vscode.commands.executeCommand('casebuddy.toggle'); // kebab -> upper_snake
    assert.ok(doc.getText().includes('MY_VAR_NAME'), 'Step 4 (upper_snake) failed');

    selectWord(editor, doc, 'MY_VAR_NAME');
    await vscode.commands.executeCommand('casebuddy.toggle'); // upper_snake -> snake
    assert.ok(doc.getText().includes('my_var_name'), 'Step 5 (back to snake) failed');
  });

  test('multiple cursors: converts all occurrences', async () => {
    const { editor, doc } = await withTempDoc('a = myVarName; b = myVarName;\n');
    const text = doc.getText();
    const i1 = text.indexOf('myVarName');
    const i2 = text.indexOf('myVarName', i1 + 1);

    editor.selections = [
      new vscode.Selection(pos(doc, i1), pos(doc, i1 + 'myVarName'.length)),
      new vscode.Selection(pos(doc, i2), pos(doc, i2 + 'myVarName'.length)),
    ];

    await vscode.commands.executeCommand('casebuddy.toSnake');

    const newText = doc.getText();
    const countSnake = (newText.match(/my_var_name/g) || []).length;
    assert.strictEqual(countSnake, 2, `Expected two conversions, got:\n${newText}`);
  });

  test('selection range: converts selected text (не только слово под курсором)', async () => {
    const { editor, doc } = await withTempDoc('word myVarName word\n');
    selectWord(editor, doc, 'myVarName');

    await vscode.commands.executeCommand('casebuddy.toSnake');

    const text = doc.getText();
    assert.ok(text.includes('my_var_name'), `Expected selection converted, got:\n${text}`);
  });
});
