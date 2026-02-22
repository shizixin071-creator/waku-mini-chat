import React, { useState, useEffect, useRef } from 'react';
import { WakuChatSDK } from './sdk/WakuChatSDK';
import { Send, Trash2, MessageSquare, Users, LogIn, Undo2, XCircle, UserCircle, Edit3 } from 'lucide-react';

const LOBBY_TOPIC = "/mini-chat/1/group-lobby/proto";
const getPrivateTopic = (id1, id2) => `/mini-chat/1/private-${[id1, id2].sort().join('-')}/proto`;

export default function App() {
  const [sdkInstance, setSdkInstance] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [me, setMe] = useState(() => {
    const saved = sessionStorage.getItem('waku_identity');
    if (saved) return JSON.parse(saved);
    const id = "ID_" + Math.random().toString(36).slice(2, 7);
    const obj = { userId: id, nickname: "用户_" + id.slice(-4) };
    sessionStorage.setItem('waku_identity', JSON.stringify(obj));
    return obj;
  });

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('waku_sessions');
    return saved ? JSON.parse(saved) : [{ id: 'group', name: '公共广场', topic: LOBBY_TOPIC, avatar: '👥' }];
  });
  
  const [currentSid, setCurrentSid] = useState('group');
  const [allMsgs, setAllMsgs] = useState(() => JSON.parse(localStorage.getItem('waku_msgs') || '{}'));
  const [input, setInput] = useState("");

  const [activeModal, setActiveModal] = useState(null); 
  const [formVal, setFormVal] = useState("");
  
  const scrollRef = useRef(null);
  const bcRef = useRef(null);

  const processMessage = (msg, topic) => {
    if (!msg || !msg.id) return;

    if (topic.includes('/private-') && !sessions.find(s => s.topic === topic)) {
      const match = topic.match(/private-([^-]+)-([^/]+)/);
      if (match) {
        const otherId = match[1] === me.userId ? match[2] : match[1];
        const newS = { id: "p_" + Date.now(), name: msg.senderName || otherId, topic, avatar: '👤', type: 'private', targetId: otherId };
        setSessions(prev => {
          const updated = [newS, ...prev];
          localStorage.setItem('waku_sessions', JSON.stringify(updated));
          return updated;
        });
        if (sdkInstance) sdkInstance.subscribe(topic, (m) => processMessage(m, topic));
      }
    }

    setAllMsgs(prev => {
      const list = prev[topic] || [];
      let newList;
      if (msg.type === 'revoke') {
        newList = list.map(m => m.id === msg.targetId ? { ...m, revoked: true } : m);
      } else {
        if (list.find(x => x.id === msg.id)) return prev;
        newList = [...list, msg];
      }
      const state = { ...prev, [topic]: newList };
      localStorage.setItem('waku_msgs', JSON.stringify(state));
      return state;
    });
  };

  useEffect(() => {
    bcRef.current = new BroadcastChannel('waku_v13_sync');
    bcRef.current.onmessage = (e) => processMessage(e.data.payload, e.data.topic);

    const chat = new WakuChatSDK(me);
    chat.init().then(() => {
      setSdkInstance(chat);
      setStatus('online');
      sessions.forEach(s => chat.subscribe(s.topic, (m) => processMessage(m, s.topic)));
    }).catch(() => {
      setSdkInstance(chat);
      setStatus('ready');
      sessions.forEach(s => chat.subscribe(s.topic, (m) => processMessage(m, s.topic)));
    });

    return () => bcRef.current?.close();
  }, [me.userId]);

  const send = async (text, type = 'text', targetId = null) => {
    if (type === 'text' && !text.trim()) return;
    const activeS = sessions.find(s => s.id === currentSid);
    if (!activeS) return;

    const payload = { id: crypto.randomUUID(), sender: me.userId, senderName: me.nickname, timestamp: Date.now(), type, content: text, targetId };
    processMessage(payload, activeS.topic);
    bcRef.current?.postMessage({ topic: activeS.topic, payload });

    if (sdkInstance) {
      sdkInstance.sendMessage(activeS.topic, text, type, targetId).catch(() => {});
    }
    if (type === 'text') setInput("");
  };

  // --- 核心修复逻辑：各功能的具体实现函数 ---
  const handleStartChat = () => {
    if (!formVal.trim()) return;
    const topic = getPrivateTopic(me.userId, formVal);
    const exist = sessions.find(s => s.topic === topic);
    if (exist) {
      setCurrentSid(exist.id);
    } else {
      const sid = "p_" + Date.now();
      const newS = { id: sid, name: "私聊: " + formVal, topic, avatar: '👤', type: 'private', targetId: formVal };
      const updated = [newS, ...sessions];
      setSessions(updated);
      localStorage.setItem('waku_sessions', JSON.stringify(updated));
      if (sdkInstance) sdkInstance.subscribe(topic, (m) => processMessage(m, topic));
      setCurrentSid(sid);
    }
    closeModal();
  };

  const handleCreateGroup = () => {
    if (!formVal.trim()) return;
    const top = `/mini-chat/1/group-${Date.now()}/proto`;
    const sid = "g_" + Date.now();
    const newS = { id: sid, name: formVal, topic: top, avatar: '👥' };
    const updated = [newS, ...sessions];
    setSessions(updated);
    localStorage.setItem('waku_sessions', JSON.stringify(updated));
    if (sdkInstance) sdkInstance.subscribe(top, m => processMessage(m, top));
    setCurrentSid(sid);
    closeModal();
  };

  const handleJoinGroup = () => {
    if (!formVal.trim()) return;
    const sid = "j_" + Date.now();
    const newS = { id: sid, name: "加入的群组", topic: formVal, avatar: '🌐' };
    const updated = [newS, ...sessions];
    setSessions(updated);
    localStorage.setItem('waku_sessions', JSON.stringify(updated));
    if (sdkInstance) sdkInstance.subscribe(formVal, m => processMessage(m, formVal));
    setCurrentSid(sid);
    closeModal();
  };

  const handleEditName = () => {
    if (!formVal.trim()) return;
    const updatedMe = { ...me, nickname: formVal };
    setMe(updatedMe);
    sessionStorage.setItem('waku_identity', JSON.stringify(updatedMe));
    closeModal();
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormVal("");
  };

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [allMsgs, currentSid]);

  const activeSess = sessions.find(s => s.id === currentSid) || sessions[0];
  const activeMsgs = allMsgs[activeSess?.topic] || [];

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* 侧边栏 */}
      <div className="w-80 bg-white border-r flex flex-col shadow-sm shrink-0">
        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center h-16">
          <h1 className="font-bold flex items-center gap-2 text-lg"><MessageSquare size={22}/> 聊天</h1>
          <div className="flex gap-4">
             <button onClick={() => setActiveModal('joinGroup')} title="加入群聊"><LogIn size={20}/></button>
             <button onClick={() => setActiveModal('newGroup')} title="创建群聊"><Users size={20}/></button>
             <button onClick={() => setActiveModal('chat')} className="text-2xl font-bold">+</button>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {sessions.map(s => (
            <div key={s.id} onClick={() => setCurrentSid(s.id)} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 border-b border-slate-50 relative group/sess ${currentSid === s.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-sm">{s.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{s.name}</div>
                <p className="text-[10px] text-slate-400 truncate font-mono">{s.topic}</p>
              </div>
              {s.id !== 'group' && (
                <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(x => x.id !== s.id)); }} className="hidden group-hover/sess:flex text-slate-300 hover:text-red-500"><XCircle size={18}/></button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 border-t flex items-center gap-3 cursor-pointer hover:bg-slate-100" onClick={() => { setFormVal(me.nickname); setActiveModal('editName'); }}>
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><UserCircle size={24}/></div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate flex items-center gap-1">{me.nickname} <Edit3 size={12}/></div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{me.userId}</div>
            </div>
        </div>
      </div>

      {/* 聊天区 */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        <header className="h-16 border-b flex items-center px-6 justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeSess?.avatar}</span>
            <div>
              <div className="font-bold text-sm">{activeSess?.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{activeSess?.topic}</div>
            </div>
          </div>
          <div className={`text-[10px] px-3 py-1 rounded-full font-bold shadow-sm ${
            status === 'online' ? 'bg-green-100 text-green-600' : 
            status === 'ready' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
          }`}>
            {status === 'online' ? '● 在线' : status === 'ready' ? '● 已就绪' : '○ 连接中'}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {activeMsgs.map((m, i) => (
            <div key={m.id || i} className={`flex ${m.sender === me.userId ? 'justify-end' : 'justify-start'} group`}>
              <div className={`relative max-w-[75%] p-3 rounded-2xl shadow-md ${m.sender === me.userId ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>
                <div className="text-[10px] opacity-60 mb-1 flex justify-between gap-4">
                  <span className="font-bold">{m.sender === me.userId ? '我' : (m.senderName || m.sender)}</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="text-sm break-all">
                  {m.revoked ? <span className="italic opacity-50 flex items-center gap-1"><Undo2 size={12}/> 消息已撤回</span> : m.content}
                </div>
                {!m.revoked && m.sender === me.userId && (
                  <div className="absolute -top-4 right-0 hidden group-hover:flex gap-2">
                    <button onClick={() => send(null, 'revoke', m.id)} className="bg-white border shadow-sm p-1 rounded-full text-indigo-600 hover:scale-110"><Undo2 size={12}/></button>
                    <button onClick={() => setAllMsgs(prev => ({...prev, [activeSess.topic]: (prev[activeSess.topic]||[]).filter(x => x.id !== m.id)}))} className="bg-white border shadow-sm p-1 rounded-full text-red-500 hover:scale-110"><Trash2 size={12}/></button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        <div className="p-4 border-t flex gap-2 bg-white">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="发个消息..." className="flex-1 px-4 py-2 bg-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
          <button onClick={() => send(input)} className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 active:scale-90 transition-all shadow-lg"><Send size={18}/></button>
        </div>
      </div>

      {/* 弹窗部分：逻辑全补全 */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]" onClick={closeModal}>
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4 text-center">
                {activeModal === 'chat' ? '发起私聊' : activeModal === 'newGroup' ? '创建群聊' : activeModal === 'joinGroup' ? '加入群聊' : '修改昵称'}
            </h3>
            <input 
                autoFocus 
                className="w-full border p-2 rounded-lg mb-4 text-sm outline-none focus:ring-1 focus:ring-indigo-500" 
                value={formVal} 
                onChange={e => setFormVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (activeModal === 'chat') handleStartChat();
                    else if (activeModal === 'newGroup') handleCreateGroup();
                    else if (activeModal === 'joinGroup') handleJoinGroup();
                    else if (activeModal === 'editName') handleEditName();
                  }
                }}
            />
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 py-2 text-slate-400 text-sm">取消</button>
              <button onClick={() => {
                   if (activeModal === 'chat') handleStartChat();
                   else if (activeModal === 'newGroup') handleCreateGroup();
                   else if (activeModal === 'joinGroup') handleJoinGroup();
                   else if (activeModal === 'editName') handleEditName();
              }} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg">
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}