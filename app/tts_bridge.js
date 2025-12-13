<script>
document.addEventListener('deviceready', () => {
  // Kiểm tra plugin Cordova TTS
  const hasCordovaTTS = Boolean(
    window.cordova &&
    window.TTS &&
    typeof window.TTS.speak === 'function'
  );
  if (!hasCordovaTTS) return;

  // Giữ tham chiếu tới plugin gốc
  const pluginTTS = window.TTS;

  // Ghi đè / tạo hàm speak dùng plugin, ép locale vi-VN
  window.TTS = window.TTS || {};
  window.TTS.speak = (text = '', rate) => {
    const t = String(text);
    const appRate = Number(window.AppState?.learner?.ttsRate ?? 0.9);
    let r = (rate !== undefined && rate !== null) ? Number(rate) : appRate;
    if (!Number.isFinite(r)) r = 0.9;
    r = Math.max(0.5, Math.min(1.2, r)); // giới hạn rate giữa 0.5 và 1.2

    // Gọi plugin: nhiều phiên bản trả về Promise, một số dùng callback (success, error)
    try {
      const maybePromise = pluginTTS.speak({ text: t, locale: 'vi-VN', rate: r });

      // Nếu trả về Promise, xử lý catch
      if (maybePromise && typeof maybePromise.then === 'function') {
        return maybePromise.catch(err => {
          console.warn('TTS error:', err);
          // giữ nguyên hành vi: không ném ra ngoài
        });
      }

      // Nếu không phải Promise, cố gắng gọi theo kiểu callback (options, success, error)
      return new Promise(resolve => {
        try {
          // Một số plugin gọi: speak(options, successCallback, errorCallback)
          pluginTTS.speak(
            { text: t, locale: 'vi-VN', rate: r },
            () => resolve(), // success
            err => {
              console.warn('TTS error (callback):', err);
              resolve();
            }
          );
        } catch (err) {
          // Nếu plugin không chấp nhận callback signature trên, log rồi resolve
          console.warn('TTS call failed:', err);
          resolve();
        }
      });
    } catch (err) {
      console.warn('TTS speak exception:', err);
      return Promise.resolve();
    }
  };

  // Mồi TTS sau deviceready để "mở khóa" trên Android
  try {
    const warm = pluginTTS.speak({ text: '', locale: 'vi-VN', rate: 0.8 });
    if (warm && typeof warm.then === 'function') warm.catch(() => {});
  } catch (e) {
    // im lặng nếu warm-up thất bại
  }
});
</script>