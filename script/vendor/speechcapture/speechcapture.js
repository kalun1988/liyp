/**
 *
 * Copyright Edin Mujkanovic 2016
 *
 * Author: Edin Mujkanovic
 * Created: 2016-09-09
 *
 * Description:
 * Speech detection library used to detect and capture speech from an incoming audio stream of data.
 * Currently only supports cordova-plugin-audioinput as audio input, but I plan to also support MediaStreamSource in the future.
 *
 * License:
 * MIT
 *
 */

window.speechcapture = (function () {

    var AUDIO_RESULT_TYPE = {
            WAV_BLOB: 1,
            WEBAUDIO_AUDIOBUFFER: 2,
            RAW_DATA: 3,
            DETECTION_ONLY: 4
        },

        STATUS = {
            SPEECH_STARTED: 1,
            SPEECH_STOPPED: 2,
            SPEECH_ERROR: 3,
            CAPTURE_STARTED: 4,
            CAPTURE_STOPPED: 5,
            CAPTURE_ERROR: 6,
            ENCODING_ERROR: 7,
            SPEECH_MAX_LENGTH: 8,
            SPEECH_MIN_LENGTH: 9
        },

        ERROR_CODE = {
            NO_ERROR: 0,
            INVALID_PARAMETER: 1,
            MISSING_PARAMETER: 2,
            NO_WEB_AUDIO_SUPPORT: 3,
            CAPTURE_ALREADY_STARTED: 4,
            AUDIOINPUT_NOT_AVAILABLE: 5,
            UNSPECIFIED: 999
        },

        DEFAULT = {
            SAMPLERATE: 22050, //44100,
            AUDIOSOURCE_TYPE: 7, //audioinput.AUDIOSOURCE_TYPE.VOICE_COMMUNICATION,
            CHANNELS: 1, //audioinput.CHANNELS.MONO,
            FORMAT: 'PCM_16BIT', //audioinput.FORMAT.PCM_16BIT,

            BUFFER_SIZE: 16384,// ,
            CONCATENATE_MAX_CHUNKS: 1,

            SPEECH_DETECTION_THRESHOLD: 15, // dB
            SPEECH_DETECTION_ALLOWED_DELAY: 400, // mS
            SPEECH_DETECTION_MAX_LENGTH: 500, // mS
            SPEECH_DETECTION_MIN_LENGTH: 10000, // mS
            SPEECH_DETECTION_COMPRESS_PAUSES: false,
            SPEECH_DETECTION_ANALYSIS_CHUNK_LENGTH: 100, // mS

            AUDIO_RESULT_TYPE: 1,
            PREFER_GET_USER_MEDIA: false,

            DEBUG_ALERTS: false,
            DEBUG_CONSOLE: false,

            GETUSERMEDIA_ACTIVE: true,
            DETECT_ONLY: false
        };


    /**
     * Starts the audio capture and detection/capturing of speech.
     *
     * @param cfg - Configuration object
     * @param speechCapturedCB - Called when speech has been identified and captured
     * @param errorCB - Called when errors occurred
     * @param speechStatusCB - Notifies about speech start and stop events
     */
    var start = function (cfg, speechCapturedCB, errorCB, speechStatusCB) {

        if (!_captureRunning()) {

            if (!speechCapturedCB) {
                _lastErrorCode = ERROR_CODE.MISSING_PARAMETER;
                throw "error: Mandatory parameter 'speechCapturedCB' is missing.";
            }
            else if (!(typeof speechCapturedCB === "function")) {
                _lastErrorCode = ERROR_CODE.INVALID_PARAMETER;
                throw "error: Parameter 'speechCapturedCB' must be of type function.";
            }

            if (errorCB) {
                if (!(typeof errorCB === "function")) {
                    _lastErrorCode = ERROR_CODE.INVALID_PARAMETER;
                    throw "error: Parameter 'errorCB' must be of type function.";
                }
            }

            if (speechStatusCB) {
                if (!(typeof speechStatusCB === "function")) {
                    _lastErrorCode = ERROR_CODE.INVALID_PARAMETER;
                    throw "error: Parameter 'speechStatusCB' must be of type function.";
                }
            }

            if (!cfg) {
                cfg = {};
            }

            _cfg = {};

            // cordova-audioinput-plugin parameters
            //
            _cfg.sampleRate = cfg.sampleRate || DEFAULT.SAMPLERATE;
            _cfg.bufferSize = cfg.bufferSize || DEFAULT.BUFFER_SIZE;
            _cfg.audioSourceType = cfg.audioSourceType || DEFAULT.AUDIOSOURCE_TYPE;

            _cfg.concatenateMaxChunks = DEFAULT.CONCATENATE_MAX_CHUNKS;
            _cfg.channels = DEFAULT.CHANNELS;
            _cfg.format = DEFAULT.FORMAT;

            // Speech detection parameters
            //
            _cfg.speechCapturedCB = speechCapturedCB;
            _cfg.errorCB = errorCB || null;
            _cfg.speechStatusCB = speechStatusCB || null;
            _cfg.speechDetectionThreshold = cfg.speechDetectionThreshold || DEFAULT.SPEECH_DETECTION_THRESHOLD;
            _cfg.speechDetectionMinimum = cfg.speechDetectionMinimum || DEFAULT.SPEECH_DETECTION_MIN_LENGTH;
            _cfg.speechDetectionMaximum = cfg.speechDetectionMaximum || DEFAULT.SPEECH_DETECTION_MAX_LENGTH;
            _cfg.speechDetectionAllowedDelay = cfg.speechDetectionAllowedDelay || DEFAULT.SPEECH_DETECTION_ALLOWED_DELAY;
            _cfg.audioResultType = cfg.audioResultType || DEFAULT.AUDIO_RESULT_TYPE;
            _cfg.audioContext = cfg.audioContext || null;
            _cfg.compressPauses = cfg.compressPauses || DEFAULT.SPEECH_DETECTION_COMPRESS_PAUSES;
            _cfg.analysisChunkLength = cfg.analysisChunkLength || DEFAULT.SPEECH_DETECTION_ANALYSIS_CHUNK_LENGTH;

            _cfg.debugAlerts = cfg.debugAlerts || DEFAULT.DEBUG_ALERTS;
            _cfg.debugConsole = cfg.debugConsole || DEFAULT.DEBUG_CONSOLE;

            _cfg.preferGUM = cfg.preferGUM || DEFAULT.PREFER_GET_USER_MEDIA;
            _cfg.getUserMediaActive = DEFAULT.GETUSERMEDIA_ACTIVE;
            _cfg.detectOnly = cfg.detectOnly || DEFAULT.DETECT_ONLY;

            if (_cfg.detectOnly) {
                _cfg.audioResultType = AUDIO_RESULT_TYPE.DETECTION_ONLY;
            }

            if (_cfg.audioResultType === AUDIO_RESULT_TYPE.WEBAUDIO_AUDIOBUFFER || _cfg.preferGUM || !window.audioinput) {
                if (!_initWebAudio(_cfg.audioContext, _cfg.preferGUM)) {
                    if (_cfg.audioResultType === AUDIO_RESULT_TYPE.WEBAUDIO_AUDIOBUFFER) {
                        _lastErrorCode = ERROR_CODE.NO_WEB_AUDIO_SUPPORT;
                        throw "error: audioResultType is WEBAUDIO_AUDIOBUFFER, but Web Audio not supported on this platform!";
                    }
                }
            }

            _calculateTimePeriods(_cfg.sampleRate, _cfg.bufferSize);
            _resetAll();

            // Configuration for the cordova-audioinput-plugin
            //
            _captureCfg = {
                sampleRate: _cfg.sampleRate,
                bufferSize: _cfg.bufferSize,
                channels: _cfg.channels,
                format: _cfg.format,
                audioSourceType: _cfg.audioSourceType,
                streamToWebAudio: false
            };

            if (_getUserMediaMode) {
                _startMediaStreamSource();

            }
            else if (window.audioinput) {
                // Subscribe to audioinput events
                //
                window.removeEventListener('audioinput', onAudioInputCapture, false);
                window.addEventListener('audioinput', onAudioInputCapture, false);

                window.removeEventListener('audioinputerror', onAudioInputError, false);
                window.addEventListener('audioinputerror', onAudioInputError, false);

                // Start the cordova-audioinput-plugin capture
                //
                audioinput.start(_captureCfg);

                _getNextBuffer();

                _callSpeechStatusCB(STATUS.CAPTURE_STARTED);
            }
            else {
                _lastErrorCode = ERROR_CODE.AUDIOINPUT_NOT_AVAILABLE;
                throw "error: Nor getUserMedia or cordova-plugin-audioinput are available!";
            }
        }
        else {
            _lastErrorCode = ERROR_CODE.CAPTURE_ALREADY_STARTED;
            _callSpeechStatusCB(STATUS.CAPTURE_ERROR);
        }
    };


    /**
     * Stops capturing.
     */
    var stop = function () {

        if (window.audioinput && audioinput.isCapturing()) {
            window.audioinput.stop();
        }

        if (_currentSpeechHistory.length > 0) {
            _handleAudioBufferCreation(_currentSpeechHistory);
        }

        _captureStopped();
        _resetAll();

        _getUserMediaMode = false;
        _getUserMedia = null;
        _mediaStream = null;
    };


    /**
     * Returns true if audio capture has been started.
     *
     * @returns {boolean}
     */
    var isCapturing = function () {
        return _captureRunning();
    };


    /**
     * Returns true if speech start event has occurred and is still in effect.
     *
     * @returns {boolean}
     */
    var isSpeakingRightNow = function () {
        return _speakingRightNow;
    };


    /**
     * Returns the current configuration.
     *
     * @returns {*}
     */
    var getCfg = function () {
        return _cfg;
    };


    /**
     * Returns the current decibel level of the captured audio.
     *
     * @returns {number|*}
     */
    var getCurrentVolume = function () {
        if (_lastAudioLevel) {
            return parseFloat(_lastAudioLevel).toFixed(0);
        }
        else {
            return -1;
        }
    };


    /**
     * Returns the current monitoring data.
     *
     * @returns {*}
     */
    var getMonitoringData = function () {

        var audioInputDataCapturing = false;
        if (window.audioinput) {
            audioInputDataCapturing = audioinput.isCapturing();
        }

        return {
            RealTime: {
                AmbientAverageLevel: parseFloat(_ambientAverageLevel).toFixed(0),
                CurrentLevel: parseFloat(_lastAudioLevel).toFixed(0),
                CurrentThreshold: parseFloat(_currentThreshold).toFixed(0),
                CurrentSpeechChunks: _currentSpeechLength,
                CurrentSpeechBufferSize: _currentSpeechHistory.length,
                CurrentSpeechLength: _noSpeechPeriod,
                TotalNumOfSpeechChunks: _totalNumOfSpeechChunks,
                InputQueueLength: _audioDataQueue.length,
                InputDataTotal: _audioInputDataTotal
            },
            Events: {
                NumOfStart: _noOfEventsStart,
                NumOfContinue: _noOfEventsContinue,
                NumOfStop: _noOfEventsStop,
                NumOfMin: _noOfEventsMin,
                NumOfMax: _noOfEventsMax
            },
            GetUserMedia: {
                Active: _getUserMediaMode,
                CapturingStatus: _getUserMediaRunning
            },
            AudioInput: {
                Active: audioInputDataCapturing,
                Events: _audioInputEvents
            },
            Cfg: _cfg,
            Internals: {
                AnalysisBufferSize: _analysisBufferSize,
                AnalysisIterations: _analyzeIterations,
                AnalysisBuffersPerIteration: _noOfAnalysisBuffersPerIteration,
                AnalysisBufferLengthInS: parseFloat(_analysisBufferLengthInS).toFixed(3),
                AudioInputFrequency: _audioInputFrequency,
                InputBufferLenInS: parseFloat(_bufferLengthInSeconds).toFixed(3),
                MinLengthChunks: _speechMinimumLengthChunks,
                MaxLengthChunks: _speechMaximumLengthChunks,
                AllowedDelayChunks: _speechAllowedDelayChunks,
                GetNextBufferIterations: _getNextBufferIterations
            }
        };
    };


    /**
     *
     * @returns {*|null}
     */
    var getAudioContext = function () {
        return _audioContext;
    };


    /**
     * Called continuously while capture is running.
     */
    var onAudioInputCapture = function (evt) {
        try {
            _audioInputEvents++;

            if (evt && evt.data) {
                _audioDataQueue.push(new Float32Array(evt.data));
            }
        }
        catch (ex) {
            _callErrorCB(ex);
        }
    };


    /**
     * Called when a plugin error happens.
     */
    var onAudioInputError = function (error) {
        _callErrorCB(error);
    };


    /**
     *
     * @returns {number}
     */
    var getLastErrorCode = function () {
        return _lastErrorCode;
    };


    /******************************************************************************************************************/
    /*                                                PRIVATE/INTERNAL                                                */
    /******************************************************************************************************************/


    var _getNextBufferDuration = 50,

        _analyzeIterations = 0,
        _silentIterations = 0,
        _noOfEventsContinue = 0,
        _noOfEventsStart = 0,
        _noOfEventsStop = 0,
        _noOfEventsMax = 0,
        _noOfEventsMin = 0,
        _totalNumOfSpeechChunks = 0,

        _audioDataQueue = [],
        _currentSpeechHistory = [],
        _currentSpeechLength = 0,
        _lastAudioLevel = -50,
        _currentThreshold = 0,
        _noSpeechPeriod = 0,
        _ambientTotal = 0,
        _ambientAverageLevel = 0,

        _analysisBufferSize = 0,
        _noOfAnalysisBuffersPerIteration = 0,
        _audioInputFrequency = 0,
        _bufferLengthInSeconds = 0,

        _speechAllowedDelayChunks = 0,
        _speechMinimumLengthChunks = 0,
        _speechMaximumLengthChunks = 0,

        _getNextBufferIterations = 0,
        _audioInputEvents = 0,
        _analysisBufferLengthInS = 0,
        _speakingRightNow = false,

        _audioContext = null,
        _webAudioAPISupported = false,

        _lastErrorCode = ERROR_CODE.NO_ERROR,

        _cfg = {},
        _captureCfg = {},

        _streamSourceProcessor = null,
        _mediaStream = null,
        _getUserMediaMode = false,
        _getUserMediaSupported = false,
        _getUserMediaRunning = false,
        _getUserMedia = null,

        _audioInputDataTotal = 0;

    /**
     *
     * @param sampleRate
     * @param bufferSize
     * @private
     */
    var _calculateTimePeriods = function (sampleRate, bufferSize) {
        try {
            _cfg.bufferSize = bufferSize;
            _audioInputFrequency = sampleRate / bufferSize;
            _bufferLengthInSeconds = 1 / _audioInputFrequency;

            /*var mon = {
                sampleRate: sampleRate,
                bufferSize: bufferSize,
                _audioInputFrequency: _audioInputFrequency,
                _bufferLengthInSeconds: _bufferLengthInSeconds
            };

            alert("_calculateTimePeriods: " + JSON.stringify(mon));*/

            _calculateAnalysisBuffers(bufferSize, _bufferLengthInSeconds, _cfg.analysisChunkLength);
        }
        catch (ex) {
            _callErrorCB("_calculateTimePeriods exception: " + ex);
        }
    };


    /**
     *
     * @param bufferSize
     * @param bufferLengthInSeconds
     * @param analysisChunkLength
     * @private
     */
    var _calculateAnalysisBuffers = function (bufferSize, bufferLengthInSeconds, analysisChunkLength) {
        try {
            var inputBufferSizeInMs = bufferLengthInSeconds * 1000;
            _noOfAnalysisBuffersPerIteration = Math.ceil(inputBufferSizeInMs / analysisChunkLength);
            _analysisBufferSize = Math.ceil(bufferSize / _noOfAnalysisBuffersPerIteration);
            _analysisBufferLengthInS = bufferLengthInSeconds / _noOfAnalysisBuffersPerIteration;

            _speechAllowedDelayChunks = Math.round(_cfg.speechDetectionAllowedDelay / analysisChunkLength);
            _speechMinimumLengthChunks = Math.round(_cfg.speechDetectionMinimum / analysisChunkLength);
            _speechMaximumLengthChunks = Math.round(_cfg.speechDetectionMaximum / analysisChunkLength);

            _getNextBufferDuration = analysisChunkLength;

            /*var mon = {
                bufferSize: bufferSize,
                bufferLengthInSeconds: bufferLengthInSeconds,
                analysisChunkLength: analysisChunkLength,
                inputBufferSizeInMs: inputBufferSizeInMs,
                _noOfAnalysisBuffersPerIteration: _noOfAnalysisBuffersPerIteration,
                _analysisBufferSize: _analysisBufferSize,
                _analysisBufferLengthInS: _analysisBufferLengthInS,
                _speechAllowedDelayChunks: _speechAllowedDelayChunks,
                _speechMinimumLengthChunks: _speechMinimumLengthChunks,
                _speechMaximumLengthChunks: _speechMaximumLengthChunks,
                _getNextBufferDuration: _getNextBufferDuration
            };

            alert("_calculateAnalysisBuffers: " + JSON.stringify(mon));*/
        }
        catch (ex) {
            _callErrorCB("_calculateAnalysisBuffers exception: " + ex);
        }
    };


    /**
     *
     * @param error
     * @private
     */
    var _callErrorCB = function (error) {
        var errorObj = {};

        if (error) {
            if (error.message) {
                errorObj.message = error.message;
            }
            else {
                errorObj.message = error;
            }
        }
        else {
            errorObj.message = "An unhandled error has occurred.";
        }

        if (_cfg.errorCB) {
            _cfg.errorCB(errorObj);
        }

        showConsoleError(errorObj.message);
        showAlert(errorObj.message);
    };


    /**
     *
     * @param speechData
     * @private
     */
    var _callSpeechCapturedCB = function (speechData) {
        if (_cfg.speechCapturedCB) {
            _cfg.speechCapturedCB(speechData, _cfg.audioResultType);
        }
        else {
            _callErrorCB("_callSpeechCapturedCB: No callback defined!");
        }
    };


    /**
     *
     * @param eventType
     * @private
     */
    var _callSpeechStatusCB = function (eventType) {
        if (_cfg.speechStatusCB) {
            _cfg.speechStatusCB(eventType);
        }
        else {
            _callErrorCB("_callSpeechStatusCB: No callback defined!");
        }
    };


    /**
     * Consume data from the audio queue and handles speech events
     * @private
     */
    var _getNextBuffer = function () {
        try {
            _getNextBufferIterations++;

            // Are we still capturing?
            if (_captureRunning()) {

                var audioInputData = _consumeFromAudioInputQueue();

                if (audioInputData && audioInputData.length > 0) {
                    _iteratedAndMonitorInputBuffer(audioInputData);
                }

                // Repeat...
                setTimeout(_getNextBuffer, _getNextBufferDuration);
            }
            else {
                // Was speech previously started?
                if (_speakingRightNow) {
                    _stopSpeechEvent(_currentSpeechHistory);
                }
            }
        }
        catch (e) {
            _callErrorCB("_getNextBuffer exception: " + e);
            _callSpeechStatusCB(STATUS.SPEECH_ERROR);
            _resetAll();
        }
    };


    /**
     * Gets new audio data from the audio input queue.
     *
     * @private
     */
    var _consumeFromAudioInputQueue = function () {

        var audioInputData = new Float32Array(0),
            chunk = null;

        if (_audioDataQueue.length > 0) {
            for (var i = 0; i < _cfg.concatenateMaxChunks; i++) {
                if (_audioDataQueue.length === 0) {
                    break;
                }

                chunk = _audioDataQueue.shift();
                audioInputData = audioInputData.concat(chunk);
                _audioInputDataTotal += chunk.length;
            }
        }

        return audioInputData;
    };


    /**
     *
     * @param audioInputBuffer
     * @private
     */
    var _iteratedAndMonitorInputBuffer = function (audioInputBuffer) {
        try {
            var len = audioInputBuffer.length;

            // If buffer isn't of the expected size, recalculate everything based on the new length
            if(audioInputBuffer.length !== _cfg.bufferSize) {
                _calculateTimePeriods(_cfg.sampleRate, audioInputBuffer.length);
            }

            for (var i = 0; i < _noOfAnalysisBuffersPerIteration; i++) {
                var startIdx = i * _analysisBufferSize,
                    endIdx = startIdx + _analysisBufferSize;

                if (endIdx > audioInputBuffer.length) {
                    endIdx = audioInputBuffer.length;
                }

                var buf = audioInputBuffer.slice(startIdx, endIdx);

                if (!_monitor(buf)) {
                    return; // Ignore more speech
                }
            }
        }
        catch (e) {
            _callErrorCB("_iteratedAndMonitorInputBuffer exception: " + e);
            _callSpeechStatusCB(STATUS.SPEECH_ERROR);
        }
    };


    /**
     *
     * @param audioBuffer
     * @private
     */
    var _monitor = function (audioBuffer) {
        try {

            // First: Has maximum length threshold occurred or continue?
            if (_currentSpeechLength + 1 > _speechMaximumLengthChunks) {
                _maximumLengthSpeechEvent(_currentSpeechHistory);
                return false;
            }

            // Is somebody speaking?
            if (_identifySpeech(audioBuffer)) {
                // Speech Started or continued?
                if (!_speakingRightNow) {
                    _startSpeechEvent(audioBuffer);
                }
                else {
                    _continueSpeechEvent(audioBuffer, false);
                }
            }
            else {
                // No speech was identified this time, was speech previously started?
                if (_speakingRightNow) {
                    _noSpeechPeriod++;

                    // Was speech paused long enough to stop speech event?
                    if (_noSpeechPeriod > _speechAllowedDelayChunks) {
                        _stopSpeechEvent(_currentSpeechHistory);
                    }
                    else {
                        if (!_cfg.compressPauses) {
                            _continueSpeechEvent(audioBuffer, true);
                        }
                    }
                }

                // Handle silence
                _calculateAmbientAverageLevel(_lastAudioLevel);
            }

            return true;
        }
        catch (e) {
            _callErrorCB("_monitor exception: " + e);
            _callSpeechStatusCB(STATUS.SPEECH_ERROR);
            _resetAll();
            return false;
        }
    };


    /**
     *
     * @param audioBuffer
     * @returns {boolean}
     * @private
     */
    var _identifySpeech = function (audioBuffer) {
        try {

            if (audioBuffer && audioBuffer.length > 0) {
                _analyzeIterations++;

                var currentLevel = _getAudioLevels(audioBuffer);

                if (currentLevel !== -Infinity) {

                    _lastAudioLevel = currentLevel;

                    if (_lastAudioLevel > _currentThreshold) {
                        _totalNumOfSpeechChunks++;
                        return true;
                    }
                }
            }
        }
        catch (e) {
            _callErrorCB("_identifySpeech exception: " + e);
            _callSpeechStatusCB(STATUS.SPEECH_ERROR);
        }

        return false;
    };


    /**
     *
     * @private
     */
    var _calculateAmbientAverageLevel = function (audioLevel) {
        _silentIterations++;
        _ambientTotal = _ambientTotal + audioLevel;
        _ambientAverageLevel = _ambientTotal / _silentIterations;
        _currentThreshold = _ambientAverageLevel + _cfg.speechDetectionThreshold;
        _currentThreshold = _currentThreshold > 0 ? 0 : _currentThreshold;
    };


    /**
     *
     * @param audioBuffer
     *
     * @private
     * @returns {*}
     */
    var _getAudioLevels = function (audioBuffer) {
        try {

            var total = 0,
                length = audioBuffer.length,
                decibel,
                rms,
                absFreq;

            for (var i = 0; i < length; i++) {
                absFreq = Math.abs(audioBuffer[i]);
                total += ( absFreq * absFreq );
            }

            rms = Math.sqrt(total / length);
            decibel = _getDecibelFromAmplitude(rms);


            return decibel;
        }
        catch (e) {
            _callErrorCB("_getAudioLevels exception: " + e);
            _callSpeechStatusCB(STATUS.SPEECH_ERROR);
        }

        return null;
    };


    /**
     * Convert amplitude to decibel
     *
     * @param amplitudeLevel
     * @returns {number}
     * @private
     */
    var _getDecibelFromAmplitude = function (amplitudeLevel) {
        return 20 * ( Math.log(amplitudeLevel) / Math.log(10) );
    };


    /**
     *
     * @private
     */
    var _resetAll = function () {
        _speakingRightNow = false;

        _resetAudioInputQueue();
        _resetSpeechDetection();
        _resetAmbientLevels();

        _noOfEventsContinue = 0;
        _noOfEventsStart = 0;
        _noOfEventsStop = 0;
        _noOfEventsMax = 0;
        _noOfEventsMin = 0;
        _totalNumOfSpeechChunks = 0;

        _audioInputEvents = 0;
        _analyzeIterations = 0;
        _getNextBufferIterations = 0;
        _lastAudioLevel = -50;
        _currentThreshold = 0;

        _audioInputDataTotal = 0;
    };


    /**
     *
     * @private
     */
    var _resetAmbientLevels = function () {
        _ambientTotal = 0;
        _ambientAverageLevel = 0;
        _silentIterations = 0;
    };


    /**
     *
     * @private
     */
    var _resetAudioInputQueue = function () {
        _audioDataQueue = [];
    };


    /**
     *
     * @private
     */
    var _resetSpeechDetection = function () {
        _currentSpeechHistory = new Float32Array(0);
        _currentSpeechLength = 0;
        _noSpeechPeriod = 0;
    };


    /**
     *
     * @private
     */
    var _stopSpeech = function () {
        _speakingRightNow = false;
        _callSpeechStatusCB(STATUS.SPEECH_STOPPED);
    };


    /**
     *
     * @private
     */
    var _startSpeech = function () {
        _speakingRightNow = true;
        _callSpeechStatusCB(STATUS.SPEECH_STARTED);
    };


    /**
     *
     * @param speechData
     * @private
     */
    var _startSpeechEvent = function (speechData) {
        _noOfEventsStart++;
        _startSpeech();
        _resetSpeechDetection();
        _continueSpeechEvent(speechData, false);
    };


    /**
     *
     * @param speechData
     * @param silent true if this continue event is considered silent
     * @private
     */
    var _continueSpeechEvent = function (speechData, silent) {
        _noOfEventsContinue++;
        _appendSpeechToHistory(speechData);
        if (!silent) {
            _noSpeechPeriod = 0;
        }
    };


    /**
     *
     * @param speechData
     * @private
     */
    var _maximumLengthSpeechEvent = function (speechData) {
        _noOfEventsMax++;
        _stopSpeechEvent(speechData);
        _callSpeechStatusCB(STATUS.SPEECH_MAX_LENGTH);
    };


    /**
     *
     * @param speechData
     * @private
     */
    var _stopSpeechEvent = function (speechData) {
        _noOfEventsStop++;
        _handleAudioBufferCreation(speechData);
        _stopSpeech();
        _resetSpeechDetection();
    };


    /**
     *
     * @param speechData
     * @private
     */
    var _appendSpeechToHistory = function (speechData) {
        if (!_cfg.detectOnly) {
            _currentSpeechHistory = _currentSpeechHistory.concat(speechData);
        }
        _currentSpeechLength++;
    };


    /**
     *
     * @param speechData
     * @private
     */
    var _handleAudioBufferCreation = function (speechData) {

        // Was the speech long enough to create an audio buffer?
        if (_currentSpeechLength > _speechMinimumLengthChunks) { // speechData && speechData.length > 0 &&
            var audioResult = null,
                preEncodingBuffer = speechData.slice(0);

            switch (_cfg.audioResultType) {
                case AUDIO_RESULT_TYPE.WEBAUDIO_AUDIOBUFFER:
                    audioResult = _createWebAudioBuffer(preEncodingBuffer);
                    break;
                case AUDIO_RESULT_TYPE.RAW_DATA:
                    audioResult = preEncodingBuffer;
                    break;
                case AUDIO_RESULT_TYPE.DETECTION_ONLY:
                    audioResult = null;
                    break;
                default:
                case AUDIO_RESULT_TYPE.WAV_BLOB:
                    audioResult = _createWAVAudioBuffer(preEncodingBuffer);
                    break;
            }

            _callSpeechCapturedCB(audioResult);
        }
        else {
            _noOfEventsMin++;
            _callSpeechStatusCB(STATUS.SPEECH_MIN_LENGTH);
        }
    };

    /**
     *
     * @param audioDataBuffer
     * @private
     */
    var _createWAVAudioBuffer = function (audioDataBuffer) {
        try {
            var wavData = wavEncoder.encode(audioDataBuffer, _cfg.sampleRate, _cfg.channels);

            return new Blob([wavData], {
                type: 'audio/wav'
            });
        }
        catch (e) {
            _callErrorCB("_createWAVAudioBuffer exception: " + e);
            _callSpeechStatusCB(STATUS.ENCODING_ERROR);
            return null;
        }
    };


    /**
     *
     * @param rawAudioBuffer
     * @private
     */
    var _createWebAudioBuffer = function (rawAudioBuffer) {
        try {
            var audioBuffer = getAudioContext().createBuffer(_captureCfg.channels, (rawAudioBuffer.length / _captureCfg.channels),
                _captureCfg.sampleRate);

            if (_captureCfg.channels > 1) {
                for (var i = 0; i < _captureCfg.channels; i++) {
                    var chdata = [],
                        index = 0;

                    while (index < rawAudioBuffer.length) {
                        chdata.push(rawAudioBuffer[index + i]);
                        index += parseInt(_captureCfg.channels);
                    }

                    audioBuffer.getChannelData(i).set(new Float32Array(chdata));
                }
            }
            else {
                // For just one channels (mono)
                audioBuffer.getChannelData(0).set(rawAudioBuffer);
            }

            return audioBuffer;
        }
        catch (e) {
            _callErrorCB("_createWebAudioBuffer exception: " + e);
            _callSpeechStatusCB(STATUS.ENCODING_ERROR);
            return null;
        }
    };

    /**
     * Creates the Web Audio Context if needed
     * @private
     */
    var _initWebAudio = function (audioCtxFromCfg, preferGUM) {
        try {
            _webAudioAPISupported = false;

            window.AudioContext = window.AudioContext || window.webkitAudioContext;

            if (audioCtxFromCfg) {
                _audioContext = audioCtxFromCfg;
            }
            else if (!_audioContext) {
                _audioContext = new window.AudioContext();
                _webAudioAPISupported = true;
            }

            if (AudioContext.prototype.hasOwnProperty('createMediaStreamSource') && _cfg.getUserMediaActive) {
                _getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia || navigator.msGetUserMedia).bind(navigator);

                if (_getUserMedia) {
                    _getUserMediaSupported = true;

                    if (preferGUM || !window.audioinput) {
                        _getUserMediaMode = true;
                        _cfg.sampleRate = _audioContext.sampleRate;
                    }
                }
            }

            return true;
        }
        catch (e) {
            return false;
        }
    };

    /**
     *
     * @returns {boolean}
     */
    var _startMediaStreamSource = function () {
        if (_getUserMedia && _getUserMediaMode) {
            try {
                _getUserMedia({
                    video: false,
                    audio: true
                }, function (stream) {
                    try {
                        _mediaStream = _audioContext.createMediaStreamSource(stream);

                        _streamSourceProcessor = _audioContext.createScriptProcessor(_cfg.bufferSize, 1, 1);

                        _streamSourceProcessor.onaudioprocess = function (audioProcessingEvent) {
                            if (_getUserMediaRunning) {
                                try {
                                    _audioInputEvents++;

                                    //var cpy = new Float32Array();

                                    _audioDataQueue.push(audioProcessingEvent.inputBuffer.getChannelData(0)); // Array.prototype.slice.call(cpy)
                                }
                                catch (e) {
                                    _captureStopped();
                                    _callErrorCB("_startMediaStreamSource.onaudioprocess exception: " + e);
                                }
                            }
                        };

                        _mediaStream.connect(_streamSourceProcessor);
                        _streamSourceProcessor.connect(_audioContext.destination);

                        _captureStarted();
                        _getNextBuffer();
                    }
                    catch (e) {
                        _callErrorCB("_startMediaStreamSource getUserMedia exception: " + e);
                        _captureStopped();
                    }
                }, function (error) {
                    _callErrorCB("_startMediaStreamSource - Failed to get MediaStream: " + error);
                    _captureStopped();
                });
            }
            catch (e) {
                _callErrorCB("_startMediaStreamSource exception: " + e);
                _captureStopped();
            }
        }
        else {
            throw("error: GetUserMedia is not supported!");
        }
    };


    /**
     *
     * @private
     */
    var _captureStopped = function () {
        if (_getUserMediaMode) {
            _getUserMediaRunning = false;
            if (_streamSourceProcessor) {
                _streamSourceProcessor.onaudioprocess = null;
            }
            _streamSourceProcessor = null;
            _callSpeechStatusCB(STATUS.CAPTURE_STOPPED);
        }
    };


    /**
     *
     * @private
     */
    var _captureStarted = function () {
        if (_getUserMediaMode) {
            _getUserMediaRunning = true;
        }

        _callSpeechStatusCB(STATUS.CAPTURE_STARTED);
    };


    /**
     *
     * @returns {*}
     * @private
     */
    var _captureRunning = function () {
        if (_getUserMediaMode) {
            return _getUserMediaRunning;
        }
        else if (window.audioinput) {
            return audioinput.isCapturing();
        }
        else {
            return false;
        }
    };


    /**
     *
     * @param message
     */
    var showAlert = function (message) {
        if (_cfg.debugAlerts && message) {
            alert(message);
        }
    };


    /**
     *
     * @param message
     */
    var showConsoleError = function (message) {
        if (_cfg.debugConsole && message) {
            console.log(message);
        }
    };


// Public interface
    return {
        STATUS: STATUS,
        AUDIO_RESULT_TYPE: AUDIO_RESULT_TYPE,
        DEFAULT: DEFAULT,

        start: start,
        stop: stop,
        isCapturing: isCapturing,
        getCurrentVolume: getCurrentVolume,
        isSpeakingRightNow: isSpeakingRightNow,
        getCfg: getCfg,
        getMonitoringData: getMonitoringData,
        getAudioContext: getAudioContext,
        getLastErrorCode: getLastErrorCode,

        onAudioInputCapture: onAudioInputCapture,
        onAudioInputError: onAudioInputError
    };

})
();


// Shim for Float32Array.prototype.slice
if (!Float32Array.prototype.slice) {
    Float32Array.prototype.slice = function (begin, end) {
        if(!end) {
            end = this.length;
        }

        //alert("Float32Array.prototype.slice begin: " + begin + ", end: " + end + ", len: " + this.length + " => " + (end - begin));

        var target = new Float32Array(end - begin);

        for (var i = 0; i < begin + end; ++i) {
            target[i] = this[begin + i];
        }
        return target;
    };
}


/**
 *
 * @returns {Float32Array}
 */
Float32Array.prototype.concat = function () {
    var bytesPerIndex = 4,
        buffers = Array.prototype.slice.call(arguments);

    // add self
    buffers.unshift(this);

    buffers = buffers.map(function (item) {
        if (item instanceof Float32Array) {
            return item.buffer;
        }
        else if (item instanceof ArrayBuffer) {
            if (item.byteLength / bytesPerIndex % 1 !== 0) {
                throw new Error('One of the ArrayBuffers is not from a Float32Array');
            }
            return item;
        }
        else {
            throw new Error('You can only concat Float32Array, or ArrayBuffers');
        }
    });

    var concatenatedByteLength = buffers
        .map(function (a) {
            return a.byteLength;
        })
        .reduce(function (a, b) {
            return a + b;
        }, 0);

    var concatenatedArray = new Float32Array(concatenatedByteLength / bytesPerIndex);

    var offset = 0;
    buffers.forEach(function (buffer, index) {
        concatenatedArray.set(new Float32Array(buffer), offset);
        offset += buffer.byteLength / bytesPerIndex;
    });

    return concatenatedArray;
};



/**
 *
 * @type {{encode}}
 */
var wavEncoder = (function () {

    /**
     *
     * @param samples - The sample array
     * @param sampleRate - The sampe rate
     * @param channels - The number of channels
     * @returns {DataView}
     */
    var encode = function (samples, sampleRate, channels) {
        var numFrames = samples.length,
            numChannels = channels || 1,
            bytesPerSample = 2,
            bitsPerSample = bytesPerSample * 8,
            blockAlign = numChannels * bytesPerSample,
            byteRate = sampleRate * blockAlign,
            dataSize = numFrames * blockAlign;

        var buffer = new ArrayBuffer(44 + dataSize),
            view = new DataView(buffer);

        writeString(view, 0, 'RIFF'); // ChunkID
        view.setUint32(4, 32 + dataSize, true); // Chunk Size
        writeString(view, 8, 'WAVE'); // Format
        writeString(view, 12, 'fmt '); // Subchunk1ID
        view.setUint32(16, 16, true); // Subchunk1Size
        view.setUint16(20, 1, true); // Audio Format
        view.setUint16(22, numChannels, true); // Number of channels
        view.setUint32(24, sampleRate, true); // Sample Rate
        view.setUint32(28, byteRate, true); // Byte Rate
        view.setUint16(32, blockAlign, true); // Block Align
        view.setUint16(34, bitsPerSample, true); // Bits Per Sample
        writeString(view, 36, 'data'); // Subchunk2ID
        view.setUint32(40, dataSize, true); // Subchunk2Size

        floatTo16BitPCM(view, 44, samples);

        return view;
    };

    /**
     *
     * @param view
     * @param offset
     * @param string
     */
    var writeString = function (view, offset, string) {
        for (var i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    /**
     *
     * @param output
     * @param offset
     * @param input
     */
    var floatTo16BitPCM = function (output, offset, input) {
        for (var i = 0; i < input.length; i++, offset += 2) {
            var s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    };

    // Public interface
    return {
        encode: encode
    };
})();