import { useState, useEffect } from 'react';
import './App.css';
import { GoogleGenerativeAI } from "@google/generative-ai";

function App() {
  const [user, setUser] = useState(null);
  const [loginName, setLoginName] = useState("");
  const [items, setItems] = useState([]);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    try {
      const res = await fetch("https://hackathon-backend-152213144011.us-central1.run.app/items");
      const data = await res.json();
      setItems(data);
    } catch (err) { console.error(err); }
  };

  // ユーザー情報を更新（実績カウントを最新にするため）
  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch("https://hackathon-backend-152213144011.us-central1.run.app/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name }),
      });
      setUser(await res.json());
    } catch (err) {}
  };

  const handleLogin = async () => {
    if (!loginName) return alert("名前を入れてください");
    try {
      const res = await fetch("https://hackathon-backend-152213144011.us-central1.run.app/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: loginName }),
      });
      if (!res.ok) throw new Error("Server Error");
      setUser(await res.json());
    } catch (err) {
      alert("ログイン失敗: バックエンドを再起動(rm test.db)しましたか？");
    }
  };

  const handleSell = async () => {
    if (!name || !description) return alert("入力してください");
    try {
      await fetch("https://hackathon-backend-152213144011.us-central1.run.app/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Priceは送らない（0円）
        body: JSON.stringify({
          name, description, sold: false, seller_name: user.name
        }),
      });
      setName(""); setDescription(""); fetchItems(); refreshUser();
      alert("リストに登録しました！");
    } catch (err) { alert("エラー"); }
  };

  // ★変更：交換ボタン（自分の名前を送る）
  const handleBuy = async (itemId) => {
    if(!confirm("このアイテムと交換しますか？")) return;
    try {
      const res = await fetch(`https://hackathon-backend-152213144011.us-central1.run.app/items/${itemId}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_name: user.name }), // ★自分（交換者）の名前を送る
      });
      if (!res.ok) throw new Error("Failed");
      
      alert("🎉 交換成立！");
      fetchItems(); 
      refreshUser(); // 自分のカウントを更新
    } catch (err) { alert("エラー：すでに交換済みかもしれません"); }
  };

  const toggleChat = async (itemId) => {
    if (activeChatId === itemId) { setActiveChatId(null); return; }
    setActiveChatId(itemId);
    setMessages([]);
    const res = await fetch(`https://hackathon-backend-152213144011.us-central1.run.app/items/${itemId}/messages`);
    setMessages(await res.json());
  };

  const sendMessage = async (itemId) => {
    if (!newMessage) return;
    await fetch(`https://hackathon-backend-152213144011.us-central1.run.app/items/${itemId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_name: user.name, content: newMessage }),
    });
    setNewMessage("");
    const res = await fetch(`https://hackathon-backend-152213144011.us-central1.run.app/items/${itemId}/messages`);
    setMessages(await res.json());
  };

  // --- AI機能 (Vertex AI バックエンド経由) ---
  const handleGenerateAI = async () => {
    if (!name) return alert("名前を入れてね");
    setLoadingAI(true);
    try {
      // 自分のサーバーの /generate エンドポイントにリクエストを送る
      const res = await fetch("https://hackathon-backend-152213144011.us-central1.run.app/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `「${name}」を貨幣のない物々交換の世界で交換するための、魅力的でエモい説明文を150文字以内で書いて。` 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成エラー");
      
      // バックエンドから返ってきたテキストをセット
      setDescription(data.text);

    } catch (error) {
      console.error(error);
      alert("AIエラー: " + error.message);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ marginTop: "100px" }}>
        <h1>次世代物々交換アプリ 🤝</h1>
        <div className="sell-form">
          <h2>🌍 世界に参加する</h2>
          <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="あなたの名前" />
          <button onClick={handleLogin} style={{ marginTop: "20px" }}>参加する</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* ヘッダー：実績表示 */}
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", background: "#333", padding: "15px", borderRadius: "10px" }}>
        <h1 style={{margin:0, fontSize:"1.2rem"}}>物々交換 🤝</h1>
        <div style={{textAlign:"right"}}>
          <div style={{fontWeight:"bold"}}>{user.name}</div>
          <div style={{fontSize:"0.8rem", color:"#ccc"}}>
            提供数: <span style={{color:"#00ff88", fontWeight:"bold"}}>{user.sold_count}</span> | 
            交換数: <span style={{color:"#00aaff", fontWeight:"bold"}}>{user.bought_count}</span>
          </div>
          <button onClick={() => setUser(null)} style={{marginTop:"5px", fontSize:"0.7rem", padding:"2px 8px"}}>ログアウト</button>
        </div>
      </header>

      <div className="sell-form">
        <h2>📦 提供する</h2>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="提供できるもの" />
        <button type="button" onClick={handleGenerateAI} disabled={loadingAI} style={{ background: "#ff007f", color: "white", margin: "10px 0", width: "100%" }}>
          {loadingAI ? "AIが執筆中..." : "✨ AIに説明文を書いてもらう"}
        </button>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="詳細" />
        <button onClick={handleSell} style={{ marginTop: "20px", width: "100%" }}>リストに載せる</button>
      </div>

      <div className="item-list">
        <h2>🌏 みんなの提供リスト</h2>
        {items.map((item) => (
          <li key={item.ID} className="item-card" style={{ opacity: item.sold ? 0.6 : 1, listStyle: "none", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>{item.name}</h3>
              <span style={{ fontSize: "0.8em", background: "#333", padding: "2px 6px", borderRadius: "4px" }}>提供: {item.seller_name}</span>
            </div>
            <p>{item.description}</p>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px", borderTop: "1px solid #444", paddingTop: "10px", alignItems: "center" }}>
              {/* 値段の代わりにステータスを表示 */}
              <div style={{ fontWeight:"bold", color: item.sold ? "red" : "#00ff88" }}>
                {item.sold ? "❌ 交換済み" : "✨ 交換募集中"}
              </div>
              
              {!item.sold && (
                <button onClick={() => handleBuy(item.ID)} style={{ background: "#00aaff" }}>交換を申し込む</button>
              )}
            </div>

            <div style={{ marginTop: "10px" }}>
              <button onClick={() => toggleChat(item.ID)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", textDecoration: "underline" }}>
                💬 コメント ({activeChatId === item.ID ? "閉じる" : "開く"})
              </button>
              {activeChatId === item.ID && (
                <div style={{ marginTop: "10px", background: "#222", padding: "10px", borderRadius: "8px" }}>
                  <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px" }}>
                    {messages.map((msg, i) => (
                      <div key={i} style={{ textAlign: msg.sender_name === user.name ? "right" : "left" }}>
                        <span style={{ background: msg.sender_name === user.name ? "#00aaff" : "#444", padding: "4px 8px", borderRadius: "8px", fontSize: "0.9rem", display: "inline-block", color: "white" }}>
                          {msg.content}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", marginTop: "5px" }}>
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="入力..." style={{flex:1}} />
                    <button onClick={() => sendMessage(item.ID)}>送信</button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </div>
    </div>
  );
}

export default App;