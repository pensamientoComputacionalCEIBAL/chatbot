
$(document).ready(function () {

  let historialChat = [];
  const idConversacion = generarIdConversacion(); // Crear ID de conversación

  const $sendButton = $('#sendButton');
  const $messageInput = $('#messageInput');
  const $chatHistory = $('#chatHistory');

  $sendButton.prop('disabled', true);
  $messageInput.prop('disabled', true);

  configInicial(); // 'async' para esperar el mensaje inicial

  $messageInput.on('keypress', function (e) { if (e.which === 13) { $sendButton.click(); } });

  // Generar un ID único simple
  function generarIdConversacion() { const ahora = new Date(); return 'conv-' + ahora.getTime(); }

  // Mensaje inicial que se guarda también en el historial
  async function configInicial() { $messageInput.prop('disabled', false).focus(); $sendButton.prop('disabled', false); }

  $sendButton.on('click', async function () {
    let message = $messageInput.val().trim();
    if (message !== '') {

      // Texto a anexar antes de enviar el prompt
      // const textoPrevio = "[Ayuda al estudiante a descubrir la respuesta con pistas simples. No la digas directamente.] ";
      let prompt = message;

      appendMessage(`<strong>Tú:</strong> ${message}`, 'user');  $messageInput.val('');

      // Deshabilitar ambos antes de la llamada
      $messageInput.prop('disabled', true);
      $sendButton.prop('disabled', true).text('Procesando...');

      if (message.toLowerCase().includes('fin_test_2025')) { appendMessage(`<strong>IA:</strong> ¡Hasta luego! Gracias por chatear. 😊`, 'ia'); return; }
      
      const aiResponse = await getAIResponse(prompt);

      try { appendMessage(`<strong>IA:</strong> ${aiResponse}`, 'ia'); } 
      catch (error) { appendMessage(`<strong>IA:</strong> Error al obtener respuesta.</strong>`, 'ia'); } 
      finally {
        // Habilitar ambos luego de la respuesta o error
        $messageInput.prop('disabled', false);
        $sendButton.prop('disabled', false).text('Enviar');
      } historialChat.push({ usuario: message, ia: aiResponse });
    }
  });


  function appendMessage(text, sender = 'user') {
    const alignment = sender === 'user' ? 'text-end' : 'text-start';
    const bgColor = sender === 'user' ? 'bg-primary text-white' : 'bg-light';
    const messageHTML = `<div class="chat-message my-2 p-2 rounded shadow-sm ${bgColor} ${alignment}">${text}</div>`;
    $chatHistory.append(messageHTML);
    $chatHistory.scrollTop($chatHistory[0].scrollHeight);
  }

  const API_KEY = "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";
  const ASSISTANT_ID = "asst_QR01cIy43dzC6juTURnuVeFr";
  let threadId = null;

  async function getAIResponse(prompt) { try {
    // Crear thread si no existe
    if (!threadId) {
      const threadRes = await fetch("https://api.openai.com/v1/threads", {
      method: "POST", headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json", "OpenAI-Beta": "assistants=v2" } });
      const threadData = await threadRes.json();
      threadId = threadData.id;
    }

    // Enviar mensaje del usuario
    const messageRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: "POST", headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json", "OpenAI-Beta": "assistants=v2" },
    body: JSON.stringify({ role: "user", content: prompt }) });

    // Crear run
    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: "POST", headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json", "OpenAI-Beta": "assistants=v2" },
    body: JSON.stringify({ assistant_id: ASSISTANT_ID }) });

    const runData = await runRes.json();
    let status = "queued";
    let runId = runData.id;

    // Esperar a que finalice el run
    while (status !== "completed" && status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}`, "OpenAI-Beta": "assistants=v2" } });
      const statusData = await statusRes.json();
      status = statusData.status;
    }

    if (status === "failed") { return "❌ El Assistant falló al procesar el mensaje."; }

    // Obtener la respuesta del assistant
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    headers: { "Authorization": `Bearer ${API_KEY}`, "OpenAI-Beta": "assistants=v2" } });
    const messagesData = await messagesRes.json();
    const assistantMsg = messagesData.data.find(msg => msg.role === "assistant");
    return assistantMsg?.content?.[0]?.text?.value || "⚠️ Sin respuesta del Assistant.";
    } catch (err) { return "Error: " + err.message; }
  }

  // Ejecutar cada 1 minuto (60000 ms)
  setInterval(() => {
    $sendButton.prop('disabled', true).text('Guardando...');
    enviarAAppWeb(historialChat);
    setTimeout(() => { $sendButton.prop('disabled', false).text('Enviar'); }, 1000);
  }, 210000);  // 3.5 minutos = 3 * 60 * 1000 + 30 * 1000 = 210000 ms

  function enviarAAppWeb(historial) {
    const historialString = JSON.stringify({ idConversacion, historial }); // Incluir ID

    const url = "https://script.google.com/macros/s/AKfycbx6F7DqKUgVVvwTzSe-ViE9jOvucp-qpfidsxMy858ZHt80zQReBiayzAqeR-UK-LQ/exec?historial=" + encodeURIComponent(historialString);

    fetch(url)
    .then(response => response.text())
    .then(result => {
    console.log(result);
    historialChat = []; // ✅ Reiniciar historial después de enviar
    }).catch(error => console.error("Error:", error));
  }

  
});
