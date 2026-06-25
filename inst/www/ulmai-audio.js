(function () {
  var state = {
    mediaRecorder: null,
    stream: null,
    chunks: [],
    startedAt: null,
    timerId: null,
    shouldSave: false,
    audioContext: null,
    audioSource: null,
    analyser: null,
    waveFrameId: null,
    waveData: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    var cancelButton = byId("uai_recording_cancel");
    var finishButton = byId("uai_recording_finish");

    if (cancelButton) {
      cancelButton.addEventListener("click", cancelRecording);
    }
    if (finishButton) {
      finishButton.addEventListener("click", finishRecording);
    }
  }

  async function startRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === "recording") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      showRecordingNotice("Recording is not supported in this browser.");
      return;
    }

    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.chunks = [];
      state.shouldSave = false;
      state.mediaRecorder = new MediaRecorder(state.stream, mediaRecorderOptions());
      state.mediaRecorder.addEventListener("dataavailable", function (event) {
        if (event.data && event.data.size > 0) {
          state.chunks.push(event.data);
        }
      });
      state.mediaRecorder.addEventListener("stop", handleRecordingStopped);
      state.mediaRecorder.start();
      showRecordingUi();
      startWaveform();
      startTimer();
    } catch (error) {
      showRecordingNotice("Microphone access was denied.");
    }
  }

  function mediaRecorderOptions() {
    var format = selectedValue("uai_audio_format", "auto");
    var types = candidateMimeTypes(format);
    var match = types.find(function (type) {
      return MediaRecorder.isTypeSupported(type);
    });
    var options = audioQualityOptions();
    if (match) {
      options.mimeType = match;
      return options;
    }
    if (format !== "auto") {
      setAudioStatus("Format unavailable, using browser default.");
    }
    return options;
  }

  function candidateMimeTypes(format) {
    var byFormat = {
      webm: ["audio/webm;codecs=opus", "audio/webm"],
      ogg: ["audio/ogg;codecs=opus", "audio/ogg"],
      mp4: ["audio/mp4;codecs=mp4a.40.2", "audio/mp4"]
    };
    if (format !== "auto" && byFormat[format]) return byFormat[format];
    return byFormat.webm.concat(byFormat.ogg, byFormat.mp4);
  }

  function audioQualityOptions() {
    var quality = selectedValue("uai_audio_quality", "standard");
    var bits = {
      small: 32000,
      standard: 64000,
      high: 128000
    };
    return { audioBitsPerSecond: bits[quality] || bits.standard };
  }

  function selectedValue(id, fallback) {
    var input = byId(id);
    return input && input.value ? input.value : fallback;
  }

  function finishRecording() {
    if (!state.mediaRecorder || state.mediaRecorder.state !== "recording") return;
    state.shouldSave = true;
    setAudioStatus("Saving...");
    state.mediaRecorder.stop();
  }

  function cancelRecording() {
    if (!state.mediaRecorder || state.mediaRecorder.state !== "recording") {
      resetRecordingUi();
      return;
    }
    state.shouldSave = false;
    state.mediaRecorder.stop();
  }

  function handleRecordingStopped() {
    stopTimer();
    stopWaveform();
    stopStream();

    if (!state.shouldSave) {
      state.chunks = [];
      resetRecordingUi();
      return;
    }

    var blob = new Blob(state.chunks, { type: recordingType() });
    state.chunks = [];
    uploadRecording(blob);
  }

  function uploadRecording(blob) {
    var input = byId("uai_audio_upload");
    if (!input) {
      setAudioStatus("Audio upload input is missing.");
      resetRecordingUiSoon();
      return;
    }

    var file = new File(
      [blob],
      "recording-" + timestampForFileName() + recordingExtension(blob.type),
      { type: blob.type || "audio/webm" }
    );

    if (typeof DataTransfer === "undefined") {
      setAudioStatus("Audio upload is not supported in this browser.");
      resetRecordingUiSoon();
      return;
    }

    var transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function recordingType() {
    if (state.mediaRecorder && state.mediaRecorder.mimeType) {
      return state.mediaRecorder.mimeType;
    }
    return "audio/webm";
  }

  function recordingExtension(type) {
    if (/mp4/.test(type)) return ".m4a";
    if (/ogg/.test(type)) return ".ogg";
    return ".webm";
  }

  function timestampForFileName() {
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  }

  function showRecordingUi() {
    var composer = document.querySelector(".uai-composer");
    var voiceButton = byId("uai_voice_btn");
    var label = document.querySelector(".uai-recording-label");
    if (composer) composer.classList.add("uai-composer-recording");
    if (voiceButton) {
      voiceButton.classList.add("uai-voice-active");
      voiceButton.setAttribute("aria-pressed", "true");
    }
    if (!label || label.textContent !== "Format unavailable, using browser default.") {
      setAudioStatus("Recording");
    }
  }

  function showRecordingNotice(text) {
    showRecordingUi();
    stopTimer();
    setTimerText("0:00");
    setAudioStatus(text);
    resetRecordingUiSoon();
  }

  function resetRecordingUi() {
    var composer = document.querySelector(".uai-composer");
    var voiceButton = byId("uai_voice_btn");
    if (composer) composer.classList.remove("uai-composer-recording");
    if (voiceButton) {
      voiceButton.classList.remove("uai-voice-active");
      voiceButton.setAttribute("aria-pressed", "false");
    }
    state.mediaRecorder = null;
    state.shouldSave = false;
    setTimerText("0:00");
    setAudioStatus("Recording");
    clearWaveform();
  }

  function resetRecordingUiSoon() {
    window.setTimeout(resetRecordingUi, 1400);
  }

  function startTimer() {
    state.startedAt = Date.now();
    setTimerText("0:00");
    stopTimer();
    state.timerId = window.setInterval(function () {
      var elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      var minutes = Math.floor(elapsed / 60);
      var seconds = String(elapsed % 60).padStart(2, "0");
      setTimerText(minutes + ":" + seconds);
    }, 250);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function setTimerText(text) {
    var timer = byId("uai_recording_timer");
    if (timer) timer.textContent = text;
  }

  function setAudioStatus(text) {
    var label = document.querySelector(".uai-recording-label");
    if (label) label.textContent = text;
  }

  function startWaveform() {
    var canvas = byId("uai_recording_wave");
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!canvas || !state.stream || !AudioContextClass) {
      clearWaveform();
      return;
    }

    state.audioContext = new AudioContextClass();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    state.waveData = new Uint8Array(state.analyser.frequencyBinCount);
    state.audioSource = state.audioContext.createMediaStreamSource(state.stream);
    state.audioSource.connect(state.analyser);
    drawWaveform();
  }

  function drawWaveform() {
    var canvas = byId("uai_recording_wave");
    if (!canvas || !state.analyser || !state.waveData) return;

    var context = canvas.getContext("2d");
    var width = canvas.width;
    var height = canvas.height;
    var bars = 24;
    var barGap = 3;
    var barWidth = Math.max(2, Math.floor((width - (bars - 1) * barGap) / bars));

    state.analyser.getByteTimeDomainData(state.waveData);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#d8d8d8";

    for (var i = 0; i < bars; i += 1) {
      var start = Math.floor(i * state.waveData.length / bars);
      var end = Math.floor((i + 1) * state.waveData.length / bars);
      var sum = 0;
      for (var j = start; j < end; j += 1) {
        sum += Math.abs(state.waveData[j] - 128);
      }
      var level = sum / Math.max(1, end - start) / 128;
      var barHeight = Math.max(4, Math.round(level * height * 1.8));
      var x = i * (barWidth + barGap);
      var y = Math.round((height - barHeight) / 2);
      context.fillRect(x, y, barWidth, barHeight);
    }

    state.waveFrameId = window.requestAnimationFrame(drawWaveform);
  }

  function stopWaveform() {
    if (state.waveFrameId) {
      window.cancelAnimationFrame(state.waveFrameId);
      state.waveFrameId = null;
    }
    if (state.audioContext) {
      state.audioContext.close();
      state.audioContext = null;
    }
    state.audioSource = null;
    state.analyser = null;
    state.waveData = null;
  }

  function clearWaveform() {
    var canvas = byId("uai_recording_wave");
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  function stopStream() {
    if (!state.stream) return;
    state.stream.getTracks().forEach(function (track) {
      track.stop();
    });
    state.stream = null;
  }

  function receiveStoredAudio(records) {
    var record = records && records.length ? records[records.length - 1] : null;
    if (record) {
      setAudioStatus("Saved");
      window.UlmAI = window.UlmAI || {};
      window.UlmAI.lastAudioRecording = record;
    }
    resetRecordingUiSoon();
  }

  window.UlmAIAudio = window.UlmAIAudio || {};
  window.UlmAIAudio.startRecording = startRecording;
  window.UlmAIAudio.cancelRecording = cancelRecording;
  window.UlmAIAudio.finishRecording = finishRecording;
  window.UlmAIAudio.receiveStoredAudio = receiveStoredAudio;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
