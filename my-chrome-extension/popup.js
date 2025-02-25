// popup.js

// 从本地存储中获取数据
/*
chrome.storage.local.get("pageData", (result) => {
  const data = result.pageData;
  if (data) {
    document.getElementById("title").innerText = `Title: ${data.title}`;
    document.getElementById("url").innerText = `URL: ${data.url}`;
    document.getElementById("text").innerText = `Text: ${data.text.substring(0, 100)}...`; // 只显示前100个字符
  } else {
    document.getElementById("title").innerText = "No data found.";
  }
});*/
