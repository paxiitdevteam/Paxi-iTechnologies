# 🧪 Chat Widget Test Guide

## Quick Test Steps

### 1. Open Your Website
- Navigate to: **http://localhost:8000**
- The chat widget button should appear in the **bottom-right corner** (💬 icon)

### 2. Open Chat Widget
- Click the **chat button** (💬) in the bottom-right
- The chat window should open smoothly
- You should see:
  - Chat header with "Chat with us" title
  - Online status indicator
  - Welcome message: "👋 Hello! How can I help you today?"
  - Input field at the bottom
  - Send button (➤)

### 3. Test Session Creation
- The widget should automatically create a session
- Check browser console (F12) for:
  - `[Chat Widget] PMS, APIM, and CLS available, initializing...`
  - `[Chat Widget] Initialized successfully`

### 4. Send a Test Message
Try these test messages:

**Basic Test:**
```
Hello, what services do you offer?
```

**Service Inquiry:**
```
Tell me about your IT project management services
```

**Company Info:**
```
What is Paxi iTechnologies?
```

### 5. Expected Behavior

**If OpenAI API has credits:**
- ✅ You'll receive an AI-generated response
- ✅ Response will be relevant to your question
- ✅ Response time should be < 5 seconds
- ✅ Conversation history will be saved

**If OpenAI API quota exceeded:**
- ⚠️ You'll see: "I apologize, but the AI service quota has been exceeded..."
- This means you need to add credits to your OpenAI account

### 6. Check Browser Console

Open DevTools (F12) and look for:

**Success Messages:**
```
✅ [Chat Widget] PMS, APIM, and CLS available, initializing...
✅ [Chat Widget] Initialized successfully
✅ [Chat API] POST /api/chat/send
```

**Error Messages (if any):**
```
❌ [Chat Widget] Error initializing session
❌ [Chat Widget] APIM not available
❌ [AI Service] OpenAI error
```

### 7. Test Multiple Messages
- Send 2-3 messages in a row
- Verify conversation context is maintained
- Check that responses are relevant to the conversation

### 8. Test Session Persistence
- Send a message
- Close the chat widget
- Reopen the chat widget
- Your previous messages should still be there

### 9. Test on Different Pages
- Homepage: http://localhost:8000
- Services: http://localhost:8000/pages/services.html
- About: http://localhost:8000/pages/about.html
- Contact: http://localhost:8000/pages/contact.html

The chat widget should work on all pages!

---

## 🐛 Troubleshooting

### Chat Widget Not Appearing
- ✅ Check browser console for errors
- ✅ Verify server is running: `npm start`
- ✅ Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

### Send Button Not Working
- ✅ Check console for: `[Chat Widget] Send button not found!`
- ✅ Verify APIM is loaded: Type `window.APIM` in console
- ✅ Check for: `window.APIM.getAPIUrl` should be a function

### Session Errors
- ✅ Check console for session initialization errors
- ✅ Clear browser localStorage and try again
- ✅ Verify API endpoint: http://localhost:8000/api/chat/session

### AI Not Responding
- ✅ Check OpenAI API key is set: `echo $OPENAI_API_KEY`
- ✅ Verify API has credits: https://platform.openai.com/account/billing
- ✅ Check server console for AI service errors

---

## ✅ Success Checklist

- [ ] Chat widget appears on page
- [ ] Chat widget opens when clicked
- [ ] Session is created successfully
- [ ] Messages can be sent
- [ ] AI responses are received (if API has credits)
- [ ] Conversation history works
- [ ] Widget works on multiple pages
- [ ] No console errors

---

## 🎉 Ready to Test!

Open your browser and test the chat widget now!

**URL:** http://localhost:8000

Good luck! 🚀

