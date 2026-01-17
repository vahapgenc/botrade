const logger = require('./logger');

class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

function errorHandler(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // Log error
    logger.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode || 500,
        path: req?.path,
        method: req?.method
    });

    // Operational errors (trusted errors)
    if (error.isOperational) {
        return res.status(error.statusCode || 500).json({
            error: {
                message: error.message,
                statusCode: error.statusCode
            }
        });
    }

    // Programming or unknown errors (don't leak details)
    console.error('UNKNOWN ERROR:', err);
    return res.status(500).json({
        error: {
            message: 'An unexpected error occurred',
            statusCode: 500
        }
    });
}

// Async handler wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = { AppError, errorHandler, asyncHandler };
