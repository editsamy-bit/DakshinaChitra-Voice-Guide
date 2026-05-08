export async function askAssistant(message: string, language: string = 'English', history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const formattedHistory = history.map(item => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: item.parts
    }));

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        language,
        history: formattedHistory
      }),
    });

    if (response.status === 429) {
      return "QUOTA_EXHAEDED_ERROR";
    }

    if (!response.ok) {
      throw new Error('Failed to fetch from API');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
}
