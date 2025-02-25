// background.js


function openNewTab(daren_url, xpath) {
  console.log('开始执行openNewTab，URL:', daren_url, 'xpath:', xpath); // 添加日志

  // 确保 xpath 是数组形式
  const xpaths = Array.isArray(xpath) ? xpath : [xpath];

  chrome.tabs.create({ url: daren_url }, (newTab) => {
    console.log('新标签页已创建，ID:', newTab.id); // 添加日志
    const tabId = newTab.id;

    // 监听新标签页的加载完成事件
    chrome.tabs.onUpdated.addListener(function listener(tabIdUpdated, changeInfo) {
      console.log('标签页更新事件:', tabIdUpdated, changeInfo); // 添加日志
      if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
        console.log('页面加载完成，准备注入脚本');

        // 延迟执行数据提取脚本
        setTimeout(() => {
          console.log('开始注入脚本...'); // 添加日志
          // 页面加载完成后，注入脚本提取数据
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: extractDataFromPage,
            args: [xpaths]  // 传入 xpaths 数组
          }, (results) => {
            console.log('脚本注入结果:', results); // 添加日志
            if (chrome.runtime.lastError) {
              console.error('脚本注入失败:', chrome.runtime.lastError);
            } else {
              console.log('脚本注入成功');
            }
          });
        }, 2000); // 增加延迟时间到2秒

        // 移除监听器，避免重复执行
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
  });
}

function extractDataFromPage(vxpath) {
  console.log('开始提取数据: ');

  // 确保 vxpath 是数组
  const xpaths = Array.isArray(vxpath) ? vxpath : [vxpath];

  let allData = [];

  // 创建等待元素出现的函数
  async function waitForElement(xpath, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;

      if (element) {
        return element;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`等待元素超时: ${xpath}`);
  }

  // 使用 async/await 处理异步操作
  async function processXPath(xpath, index) {
    try {
      let actualXpath;
      let getXpath;

      if (xpath.includes('--get--')) {
        const parts = xpath.split('--get--');
        if (parts[0].startsWith('click--')) {
          actualXpath = parts[0].substring(7);
          getXpath = parts[1];
        } else {
          actualXpath = parts[0];
          getXpath = parts[1];
        }
      } else {
        actualXpath = xpath;
        getXpath = xpath;
      }

      if (xpath.startsWith('click--')) {
        const clickElement = await waitForElement(actualXpath);
        clickElement.click();
        console.log(`点击元素成功: ${actualXpath}`);
      }

      const dataElement = await waitForElement(getXpath);
      const rawText = dataElement.textContent.trim();

      const kvArray = rawText
        .split(',')
        .map(item => {
          // 分割并去除空白字符
          const [key = '', value = ''] = item.split(':').map(str => str.trim());

          // 如果 key 和 value 都为空，则返回 null（后续过滤）
          if (!key && !value) {
            return null;
          }

          // 如果 key 或 value 为空，则替换为 " "
          return {
            key: key || " ",
            value: value || " ",
            xpath
          };
        })
        .filter(item => item !== null); // 过滤掉 key 和 value 都为空的对象



      allData = allData.concat(kvArray);
      console.log(`xpath ${index + 1} 提取到的数据为:`, kvArray);
    } catch (error) {
      console.error(`处理 xpath ${index + 1} 时出错:`, error);
    }
  }

  // 按顺序处理所有 xpath
  Promise.all(xpaths.map((xpath, index) => processXPath(xpath, index)))
    .then(() => {
      console.log('所有提取到的数据为:', allData);
      chrome.runtime.sendMessage({ action: 'dataExtracted', data: allData });
    })
    .catch(error => {
      console.error('处理数据时出错:', error);
    });
}

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "pageData") {
    console.log("Received page data:", message.data);
    chrome.storage.local.set({ pageData: message.data }, () => {
      console.log("Page data saved.");
      sendResponse({ status: 'success' }); // 添加响应
    });
    return true; // 表明我们会异步发送响应
  }

  if (message.action === 'dataExtracted') {
    console.log('后台页面获取到的数据为:', message.data);
    const formattedData = message.data.map(item => {
      return `${item.key}: ${item.value}`;
    });
    console.log('格式化后的数据:', formattedData);

    chrome.storage.local.get(['sourceTabId'], function (result) {
      if (result.sourceTabId) {
        // 先激活原始标签页，再发送数据
        chrome.tabs.update(result.sourceTabId, { active: true }, () => {
          chrome.tabs.sendMessage(result.sourceTabId, {
            action: 'returnData',
            data: formattedData
          }).then(() => {
            chrome.tabs.remove(sender.tab.id);
            sendResponse({ status: 'success' });
          }).catch((error) => {
            console.error('发送消息失败:', error);
            sendResponse({ status: 'error', error: error.message });
          });
        });
      } else {
        chrome.tabs.remove(sender.tab.id);
        sendResponse({ status: 'success' });
      }
    });
    return true;
  }

  if (message.action === 'openNewTab') {
    chrome.storage.local.set({ sourceTabId: sender.tab.id }, function () {
      console.log('保存了原始标签页ID:', sender.tab.id);
      openNewTab(message.daren_url, message.xpath);
      sendResponse({ status: 'success' });
    });
    return true; // 表明我们会异步发送响应
  }


});

