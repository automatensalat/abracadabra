import { Editor, ErrorReason, Code } from "../../editor/editor";
import { Selection } from "../../editor/selection";
import { InMemoryEditor } from "../../editor/adapters/in-memory-editor";
import { testEach } from "../../tests-helpers";

import { convertIfElseToSwitch } from "./convert-if-else-to-switch";

// Compact indentation of generated switch statement is due to recast behaviour:
// https://github.com/benjamn/recast/issues/180

describe("Convert If/Else to Switch", () => {
  let showErrorMessage: Editor["showError"];

  beforeEach(() => {
    showErrorMessage = jest.fn();
  });

  testEach<{ code: Code; selection?: Selection; expected: Code }>(
    "should convert if/else to switch",
    [
      {
        description: "simple conditional, strict equality",
        code: `if (name === "Jane") {
  sayHelloToJane();
} else if (name === "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`,
        expected: `switch (name) {
case "Jane":
  sayHelloToJane();
  break;
case "John":
  sayHelloToJohn();
  break;
default:
  sayHello();
  break;
}`
      },
      {
        description: "simple conditional, loose equality",
        code: `if (name == "Jane") {
  sayHelloToJane();
} else if (name == "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`,
        expected: `switch (name) {
case "Jane":
  sayHelloToJane();
  break;
case "John":
  sayHelloToJohn();
  break;
default:
  sayHello();
  break;
}`
      },
      {
        description: "simple conditional, mix of strict & loose equality",
        code: `if (name == "Jane") {
  sayHelloToJane();
} else if (name === "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`,
        expected: `switch (name) {
case "Jane":
  sayHelloToJane();
  break;
case "John":
  sayHelloToJohn();
  break;
default:
  sayHello();
  break;
}`
      },
      {
        description: "simple conditional, inverted discriminant & test",
        code: `if (name === "Jane") {
  sayHelloToJane();
} else if ("John" === name) {
  sayHelloToJohn();
} else {
  sayHello();
}`,
        expected: `switch (name) {
case "Jane":
  sayHelloToJane();
  break;
case "John":
  sayHelloToJohn();
  break;
default:
  sayHello();
  break;
}`
      },
      {
        description: "convert the selected if-else only",
        code: `if (name === "Jane") {
  sayHelloToJane();
} else {
  sayHello();
}

if (name === "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`,
        expected: `switch (name) {
case "Jane":
  sayHelloToJane();
  break;
default:
  sayHello();
  break;
}

if (name === "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`
      },
      {
        description: "nested if-else, cursor on wrapper",
        code: `if (name === "Jane") {
  if (name === "John") {
    sayHelloToJohn();
  } else {
    sayHelloToJane();
  }
} else {
  sayHello();
}`,
        expected: `switch (name) {
case "Jane":
  if (name === "John") {
    sayHelloToJohn();
  } else {
    sayHelloToJane();
  }
  break;
default:
  sayHello();
  break;
}`
      },
      {
        description: "nested if-else, cursor on nested",
        code: `if (name === "Jane") {
  if (name === "John") {
    sayHelloToJohn();
  } else {
    sayHelloToJane();
  }
} else {
  sayHello();
}`,
        selection: Selection.cursorAt(1, 2),
        expected: `if (name === "Jane") {
  switch (name) {
  case "John":
    sayHelloToJohn();
    break;
  default:
    sayHelloToJane();
    break;
  }
} else {
  sayHello();
}`
      },
      {
        description: "without final else",
        code: `if (name === "Jane") {
  sayHelloToJane();
} else if (name === "John") {
  sayHelloToJohn();
}`,
        expected: `switch (name) {
case "Jane":
  sayHelloToJane();
  break;
case "John":
  sayHelloToJohn();
  break;
}`
      },
      {
        description: "with return statements",
        code: `if (name === "Jane") {
  return sayHelloToJane();
} else if (name === "John") {
  return sayHelloToJohn();
} else {
  return sayHello();
}`,
        expected: `switch (name) {
case "Jane":
  return sayHelloToJane();
case "John":
  return sayHelloToJohn();
default:
  return sayHello();
}`
      },
      {
        description: "with member expression as discriminant",
        code: `if (item.name === "Jane") {
  return sayHelloToJane();
} else if (item.name === "John") {
  return sayHelloToJohn();
} else {
  return sayHello();
}`,
        expected: `switch (item.name) {
case "Jane":
  return sayHelloToJane();
case "John":
  return sayHelloToJohn();
default:
  return sayHello();
}`
      }
    ],
    async ({ code, selection = Selection.cursorAt(0, 0), expected }) => {
      const result = await doConvertIfElseToSwitch(code, selection);

      expect(result).toBe(expected);
    }
  );

  testEach<{ code: Code; selection?: Selection }>(
    "should not convert",
    [
      {
        description: "different discriminants",
        code: `if (name === "Jane") {
  sayHelloToJane();
} else if (surname === "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`
      },
      {
        description: "invalid operators",
        code: `if (name >= "Jane") {
  sayHelloToJane();
} else if (name >= "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`
      },
      {
        description: "different operators",
        code: `if (name !== "Jane") {
  sayHelloToJane();
} else if (name === "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`
      },
      {
        description: "unary expressions",
        code: `if (!(name === "Jane")) {
  sayHelloToJane();
} else if (!(name === "John")) {
  sayHelloToJohn();
} else {
  sayHello();
}`
      },
      {
        description: "logical expressions",
        code: `if (name === "Jane" && age > 10) {
  sayHelloToJane();
} else if (name === "John") {
  sayHelloToJohn();
} else {
  sayHello();
}`
      }
    ],
    async ({ code, selection = Selection.cursorAt(0, 0) }) => {
      const result = await doConvertIfElseToSwitch(code, selection);

      expect(result).toBe(code);
    }
  );

  it("should show an error message if refactoring can't be made", async () => {
    const code = `// This is a comment, can't be refactored`;
    const selection = Selection.cursorAt(0, 0);

    await doConvertIfElseToSwitch(code, selection);

    expect(showErrorMessage).toBeCalledWith(
      ErrorReason.DidNotFoundIfElseToConvert
    );
  });

  async function doConvertIfElseToSwitch(
    code: Code,
    selection: Selection
  ): Promise<Code> {
    const editor = new InMemoryEditor(code);
    editor.showError = showErrorMessage;
    await convertIfElseToSwitch(code, selection, editor);
    return editor.code;
  }
});
