"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const TOOL_LABELS: Record<string, string> = {
  searchEdinetCompanies: "EDINET企業検索",
  getEdinetCompany: "企業詳細取得",
  searchShareholders: "株主検索",
  searchGbizinfo: "gBizINFO検索",
  searchMANews: "M&Aニュース検索",
  searchLaws: "法律検索",
  searchPapers: "論文検索",
  searchYouTube: "YouTube検索",
  searchSeminars: "セミナー検索",
  searchPeople: "人物DB検索",
  searchCommunities: "コミュニティ検索",
  searchTaxAdvisors: "税理士・会計士検索",
  searchBanks: "銀行・金融機関検索",
  searchMeetingMinutes: "議事録検索",
  getMinutesByProject: "プロジェクト議事録取得",
  getMinutesByParticipant: "参加者別議事録検索",
  searchMaProjects: "プロジェクト検索",
  getEmployeeList: "社員一覧取得",
  updateProjectStatus: "プロジェクトステータス更新",
  updateEmployeeAssignment: "社員担当更新",
  updateMinuteActionStatus: "アクション進捗更新",
};

function getToolDisplayName(rawType: string): string {
  const toolName = rawType.startsWith("tool-") ? rawType.slice(5) : rawType;
  return TOOL_LABELS[toolName] ?? toolName;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({ transport });
  const isActive = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isActive) return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="AIアシスタントを開く"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
        >
          <svg
            className="w-6 h-6 transition-transform group-hover:scale-110"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="M&A AIアシスタント"
          className="fixed z-50 bottom-6 right-6 w-[420px] h-[620px] max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-16 max-sm:w-auto max-sm:h-auto bg-white rounded-2xl shadow-2xl shadow-black/10 flex flex-col overflow-hidden ring-1 ring-black/[0.06]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-xs font-bold tracking-tight">
                AI
              </div>
              <div>
                <p className="text-[13px] font-semibold tracking-wide">
                  M&A AIアシスタント
                </p>
                <p className="text-[10px] text-blue-200/80">
                  全データベースを横断検索
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="閉じる"
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mx-auto shadow-sm">
                  <svg
                    className="w-7 h-7 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    M&A について何でも聞いてください
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    企業情報・法律・論文・ニュース等を
                    <br />
                    横断検索します
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {[
                    "トヨタの財務情報は？",
                    "株式交換の法律は？",
                    "M&Aの最新ニュース",
                    "村上ファンドの保有銘柄",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        sendMessage({ text: q });
                      }}
                      className="text-xs px-3.5 py-2 bg-white hover:bg-blue-50 hover:text-blue-600 rounded-xl text-slate-500 transition-all shadow-sm ring-1 ring-slate-200/60 hover:ring-blue-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const isUser = message.role === "user";

              // Collect tool parts for grouped display
              const toolParts = message.parts.filter(isToolUIPart);
              const textParts = message.parts.filter(
                (p) => p.type === "text" && p.text.trim(),
              );

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] space-y-1.5 ${isUser ? "items-end" : "items-start"}`}
                  >
                    {/* Tool indicators - grouped above text */}
                    {!isUser && toolParts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {toolParts.map((part, i) => {
                          const isDone = part.state === "output-available";
                          return (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium ${
                                isDone
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-amber-50 text-amber-600"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isDone
                                    ? "bg-emerald-400"
                                    : "bg-amber-400 animate-pulse"
                                }`}
                              />
                              {getToolDisplayName(part.type)}
                              {isDone ? "" : "..."}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Message bubble */}
                    {textParts.length > 0 && (
                      <div
                        className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                          isUser
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-lg shadow-sm shadow-blue-500/20"
                            : "bg-white text-slate-700 rounded-bl-lg shadow-sm ring-1 ring-slate-200/50"
                        }`}
                      >
                        {textParts.map((part, i) => {
                          if (part.type !== "text") return null;
                          if (isUser) {
                            return (
                              <div
                                key={i}
                                className="whitespace-pre-wrap break-words"
                              >
                                {part.text}
                              </div>
                            );
                          }
                          return (
                            <div key={i} className="chat-markdown">
                              <ReactMarkdown
                                components={{
                                  h1: ({ children }) => (
                                    <h3 className="text-base font-bold text-slate-800 mt-3 mb-2 first:mt-0 pb-1.5 border-b border-slate-100">
                                      {children}
                                    </h3>
                                  ),
                                  h2: ({ children }) => (
                                    <h4 className="text-[13px] font-bold text-slate-700 mt-3 mb-1.5 first:mt-0">
                                      {children}
                                    </h4>
                                  ),
                                  h3: ({ children }) => (
                                    <h5 className="text-[13px] font-semibold text-slate-600 mt-2.5 mb-1 first:mt-0">
                                      {children}
                                    </h5>
                                  ),
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0 leading-relaxed">
                                      {children}
                                    </p>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-slate-800">
                                      {children}
                                    </strong>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="space-y-0.5 mb-2 last:mb-0">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal list-inside space-y-0.5 mb-2 last:mb-0">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-[13px] leading-relaxed pl-0.5">
                                      <span className="text-blue-400 mr-1.5">
                                        •
                                      </span>
                                      {children}
                                    </li>
                                  ),
                                  hr: () => (
                                    <hr className="my-3 border-slate-100" />
                                  ),
                                  a: ({ href, children }) => (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 underline underline-offset-2 decoration-blue-300 hover:text-blue-600 hover:decoration-blue-400 transition-colors"
                                    >
                                      {children}
                                    </a>
                                  ),
                                  code: ({ children }) => (
                                    <code className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-mono">
                                      {children}
                                    </code>
                                  ),
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto my-2 rounded-lg ring-1 ring-slate-200/60">
                                      <table className="w-full text-xs">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  thead: ({ children }) => (
                                    <thead className="bg-slate-50 text-slate-600 font-medium">
                                      {children}
                                    </thead>
                                  ),
                                  th: ({ children }) => (
                                    <th className="px-2.5 py-1.5 text-left font-medium border-b border-slate-200/60">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="px-2.5 py-1.5 border-b border-slate-100">
                                      {children}
                                    </td>
                                  ),
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-2 border-blue-300 pl-3 my-2 text-slate-500 italic">
                                      {children}
                                    </blockquote>
                                  ),
                                }}
                              >
                                {part.text}
                              </ReactMarkdown>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isActive &&
              messages.length > 0 &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-lg px-4 py-3 shadow-sm ring-1 ring-slate-200/50">
                    <div className="flex gap-1.5">
                      <span
                        className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-slate-100 px-4 py-3 bg-white"
          >
            <div className="flex gap-2 items-end">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="M&Aについて質問..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all placeholder:text-slate-300"
                disabled={isActive}
                autoFocus
              />
              <button
                type="submit"
                disabled={isActive || !input.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center hover:from-blue-600 hover:to-blue-700 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm shadow-blue-500/20"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
