import { describe, it, expect } from "vitest";

import validationErrorMessage from "../../util/validationErrorMessage.js";

describe("validationErrorMessage", () => {
  it("Adds every error message in the given list to the message", () => {
    const result = validationErrorMessage(["foo", "bar"]);
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("Throws an error if the parameter is unexpected", () => {
    expect(() => validationErrorMessage(null)).toThrow();
    expect(() =>
      validationErrorMessage({ errorList: ["foo", "bar"] }),
    ).toThrow();
  });
});
