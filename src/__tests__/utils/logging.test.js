import { describe, it, expect, vi } from "vitest";
import { logInfo, logWarning, logError } from "../../util/logging.js";

describe("logging", () => {
  it("logInfo should log to the console.log", () => {
    const consoleLogMock = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    expect(consoleLogMock).toHaveBeenCalledTimes(0);

    logInfo("Some message");

    expect(consoleLogMock).toHaveBeenCalledTimes(1);

    consoleLogMock.mockRestore();
  });

  it("logWarning should log to the console.warn", () => {
    const consoleWarnMock = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    expect(consoleWarnMock).toHaveBeenCalledTimes(0);

    logWarning("Some message");

    expect(consoleWarnMock).toHaveBeenCalledTimes(1);

    consoleWarnMock.mockRestore();
  });

  it("logError should log simple messages to the console.error", () => {
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(consoleErrorMock).toHaveBeenCalledTimes(0);

    logError("Some message");

    expect(consoleErrorMock).toHaveBeenCalledTimes(1);

    consoleErrorMock.mockRestore();
  });

  it("logError should log Error objects with stack to the console.error", () => {
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(consoleErrorMock).toHaveBeenCalledTimes(0);

    const errMessage = "My error";
    const err = new Error(errMessage);
    logError(err);

    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorMock).toHaveBeenLastCalledWith(errMessage, err.stack);

    consoleErrorMock.mockRestore();
  });
});
