/**
 * Combine all the logging options into one file.
 *
 * For now we log to the console, but if in the future we want to add a logging service
 * we only need to adjust this file.
 */

/**
 * logInfo should be used to log anything that can be used for debugging but is not a problem
 */
export const logInfo = (...args) => {
  // eslint-disable-next-line no-console
  console.log(...args);
};

/**
 * logWarning should be used to log anything that signals a problem that is not app breaking
 */
export const logWarning = (...args) => {
  // eslint-disable-next-line no-console
  console.warn(...args);
};

/**
 * logError should be used to log anything that is app breaking
 */
export const logError = (errorMessage, ...additionalInfo) => {
  if (errorMessage instanceof Error) {
    // You can pass an Error to this function and we will post the stack
    // eslint-disable-next-line no-console
    console.error(errorMessage.message, errorMessage.stack, ...additionalInfo);
  } else {
    // eslint-disable-next-line no-console
    console.error("ERROR: ", errorMessage, ...additionalInfo);
  }
};

/**
 * handleError should be used to log and handle any errors in the application
 */
export const handleError = (error) => {
  // Log the error
  logError(error);

  // Handle the error as needed
  // For example, you could send it to an error tracking service
  // or display a user-friendly error message to the user
};
