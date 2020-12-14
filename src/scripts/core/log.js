import Enum from 'es6-enum';

export var ELogContext = Enum('None', 'All', 'Interaction2d', 'Item', 'Wall', 'Room');
export var ELogLevel = Enum('Information', 'Warning', 'Error', 'Fatal', 'Debug');
/** The current log context. To be set when initializing the Application. */
export var logContext = ELogContext.None;

/** Pre-check if logging for specified context and/or level is enabled.
 * This may be used to avoid compilation of complex logs.
 * @param context The log context to be verified.
 * @param level The log level to be verified.
 * @returns If this context/levels is currently logged.
 */
export function isLogging(context, level) {
    return logContext === ELogContext.All || logContext === context || level === ELogLevel.Warning || level === ELogLevel.Error || level === ELogLevel.Fatal;
}

/** Log the passed message in the context and with given level.
 * @param context The context in which the message should be logged.
 * @param level The level of the message.
 * @param message The messages to be logged. 
 */
export function log(context, level, message) {
    if (isLogging(context, level) === false) {
        return;
    }
    var tPrefix = '';
    switch (level) {
        case ELogLevel.Information:
            tPrefix = '[INFO_] ';
            break;
        case ELogLevel.Warning:
            tPrefix = '[WARNG] ';
            break;
        case ELogLevel.Error:
            tPrefix = '[ERROR] ';
            break;
        case ELogLevel.Fatal:
            tPrefix = '[FATAL] ';
            break;
        case ELogLevel.Debug:
            tPrefix = '[DEBUG] ';
            break;
    }
    console.log(tPrefix + message);
}