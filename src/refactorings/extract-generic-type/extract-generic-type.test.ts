import { Editor, ErrorReason, Code } from "../../editor/editor";
import { Selection } from "../../editor/selection";
import { InMemoryEditor } from "../../editor/adapters/in-memory-editor";
import { testEach } from "../../tests-helpers";

import { extractGenericType } from "./extract-generic-type";

describe("Extract Generic Type", () => {
  let showErrorMessage: Editor["showError"];

  beforeEach(() => {
    showErrorMessage = jest.fn();
  });

  testEach<{ code: Code; selection?: Selection; expected: Code }>(
    "should extract generic type",
    [
      {
        description: "primitive type (number)",
        code: `interface Position {
  x: number;
  y: number;
}`,
        selection: Selection.cursorAt(1, 6),
        expected: `interface Position<T = number> {
  x: T;
  y: number;
}`
      },
      {
        description: "primitive type (string)",
        code: `interface Position {
  x: string;
  y: number;
}`,
        selection: Selection.cursorAt(1, 6),
        expected: `interface Position<T = string> {
  x: T;
  y: number;
}`
      }
      // TODO: extract 1 or all occurrences of given type (e.g. "number")
      // TODO: already existing T in interface
      // TODO: nested object in interface
      // TODO: something that is not an interface (e.g. function)
      // TODO: rename on `T`
    ],
    async ({ code, selection = Selection.cursorAt(0, 0), expected }) => {
      const result = await doExtractGenericType(code, selection);

      expect(result).toBe(expected);
    }
  );

  it("should show an error message if refactoring can't be made", async () => {
    const code = `// This is a comment, can't be refactored`;
    const selection = Selection.cursorAt(0, 0);

    await doExtractGenericType(code, selection);

    expect(showErrorMessage).toBeCalledWith(
      ErrorReason.DidNotFoundTypeToExtract
    );
  });

  async function doExtractGenericType(
    code: Code,
    selection: Selection
  ): Promise<Code> {
    const editor = new InMemoryEditor(code);
    editor.showError = showErrorMessage;
    await extractGenericType(code, selection, editor);
    return editor.code;
  }
});
