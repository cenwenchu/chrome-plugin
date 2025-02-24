function waitForElementXPath(xpath, callback, timeout) {
    const startTime = Date.now();
    const interval = setInterval(function () {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const element = result.singleNodeValue;
        if (element) {
            clearInterval(interval);
            callback(element);
        } else if (timeout && Date.now() - startTime > timeout) {
            clearInterval(interval);
            alert("没有找到目标元素");
        }
    }, 300); // 每 100 毫秒检查一次
}

//采集达人信息
async function getDarenInfo(row_key) {
    const daren_url = 'https://buyin.jinritemai.com/dashboard/servicehall/daren-profile?uid=' + row_key;

   //const vxpath = ["//div[contains(@class, \"daren-profile-v2\")]"];


     const vxpath = [
         "//div[contains(@class, \"index-module__info-card\")]",
         "//div[contains(@class, \"index-module__detail-data\")]",
         "//div[contains(@class,\"index-module__fans-data\")]",  
         "click--//div[contains(@class,'auxo-tabs-tab')]/div[contains(text(),\"场景分析\")]--get--//div[contains(@class,'content-box')]/div[contains(@class,\"index-module__key-data\")]"
   //      "click--//div[contains(@class,\"index-module__contact-item\")]/span[contains(text(),\"手机号\")]/following-sibling::span[contains(@class,'index-module__contact-item-btn')]--get--//div[contains(@class,\"index-module__contact-item\")]/span[contains(text(),\"手机号\")]",
   //      "click--//div[contains(@class,\"index-module__contact-item\")]/span[contains(text(),\"微信\")]/following-sibling::span[contains(@class,'index-module__contact-item-btn')]--get--//div[contains(@class,\"index-module__contact-item\")]/span[contains(text(),\"微信\")]",
     ];

    // 在 popup.js 或 content script 中
    try {
        const response = await chrome.runtime.sendMessage({ 
            action: 'openNewTab', 
            daren_url: daren_url, 
            xpath: vxpath 
        });
        console.log('收到执行回执:', response);
    } catch (error) {
        console.error('发送消息失败:', error);
    }
}

// 定义一个处理单个元素的函数
function processElement(element) {
    // 使用更精确的 XPath 来查找原始按钮
    const originalButton = document.evaluate(".//button[.//span[contains(text(), '达人')]]", element, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    
    if (element.getAttribute('data-processed') === 'true') {
        return;
    }

    if (originalButton) {
        // 保存原始按钮的样式
        const originalClasses = originalButton.className;
        const originalStyle = window.getComputedStyle(originalButton);
        
        // 创建新按钮并复制样式
        const newButton = document.createElement('button');
        newButton.className = originalClasses;
        newButton.style.cssText = originalStyle.cssText;
        
        // 创建span元素
        const spanElement = document.createElement('span');
        spanElement.textContent = '采集达人';
        spanElement.className = originalButton.querySelector('span').className; // 复制原始span的类名
        
        newButton.appendChild(spanElement);

        const target_row = document.evaluate("ancestor::tr[contains(@class, \"auxo-table-row\")]", element, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        newButton.addEventListener('click', () => {
            getDarenInfo(target_row.getAttribute('data-row-key'));
            console.log('获取达人信息', target_row.getAttribute('data-row-key'));
        });

        // 替换原始按钮
        originalButton.parentNode.replaceChild(newButton, originalButton);
    }
    
    element.setAttribute('data-processed', 'true');
}

//为列表创建元素，来点击获取达人详细信息

console.info("--***--列表新增按钮已注入--***--");

let xpathExpression = `
//div[contains(@class, \"daren-square-container\")]
//div[contains(@class, \"select_peoples_table\")]
//div[contains(@class, \"virtual-list\")]/table/tbody
/tr[contains(@class, \"auxo-table-row\")]
/td[contains(@class, \"auxo-table-cell-fix-right\")]
//div[contains(@class, \"auxo-space-item\")]
/button/span[contains(text(), \"达人\")]
`;

// 使用 MutationObserver 监听DOM变化
const observer = new MutationObserver((mutations) => {
    const tbody = document.evaluate(
        "//div[contains(@class, \"virtual-list\")]/table/tbody",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;

    if (tbody) {
        const rows = document.evaluate(
            ".//tr[contains(@class, \"auxo-table-row\")]/td[contains(@class, \"auxo-table-cell-fix-right\")]//div[contains(@class, \"auxo-space-item\")]",
            tbody,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < rows.snapshotLength; i++) {
            const element = rows.snapshotItem(i);
            processElement(element);
        }
    }
});

// 修改 waitForElementXPath 函数的回调部分
waitForElementXPath(xpathExpression, function(element) {
    const virtualList = document.evaluate(
        "//div[contains(@class, \"virtual-list\")]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;

    if (virtualList) {
        // 首次加载时立即处理现有元素
        const rows = document.evaluate(
            ".//tr[contains(@class, \"auxo-table-row\")]/td[contains(@class, \"auxo-table-cell-fix-right\")]//div[contains(@class, \"auxo-space-item\")]",
            virtualList,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < rows.snapshotLength; i++) {
            const element = rows.snapshotItem(i);
            processElement(element);
        }

        // 然后开始观察后续变化
        observer.observe(virtualList, {
            childList: true,
            subtree: true
        });
    }
}, 6000);

//监听来自background.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'returnData') {
        try {
            console.info('收到来自background的数据：', message.data);
            
            // 创建浮层容器
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                max-width: 80%;
                max-height: 80vh;
                overflow-y: auto;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
            `;

            // 创建关闭按钮
            const closeButton = document.createElement('button');
            closeButton.textContent = '✕';
            closeButton.style.cssText = `
                position: absolute;
                right: 10px;
                top: 10px;
                border: none;
                background: none;
                cursor: pointer;
                font-size: 20px;
                color: #666;
            `;
            closeButton.addEventListener('click', () => {
                overlay.remove();
                mask.remove();
                document.body.style.overflow = 'auto';
                document.body.style.pointerEvents = 'auto';
                // 重置页面的其他样式
                document.body.style.backgroundColor = '';
                document.body.style.filter = '';
            });

            // 创建内容区域
            const content = document.createElement('div');
            content.style.marginTop = '20px';
            
            // 格式化并显示数据
            const formattedData = JSON.stringify(message.data, null, 2);
            content.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-all;">${formattedData}</pre>`;

            // 组装浮层
            overlay.appendChild(closeButton);
            overlay.appendChild(content);

            // 添加遮罩层
            const mask = document.createElement('div');
            mask.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.3);
                z-index: 9999;
            `;
            mask.onclick = () => {
                overlay.remove();
                mask.remove();
                document.body.style.overflow = 'auto';
                document.body.style.pointerEvents = 'auto';
                // 重置页面的其他样式
                document.body.style.backgroundColor = '';
                document.body.style.filter = '';
            };

            // 将浮层和遮罩添加到页面
            document.body.appendChild(mask);
            document.body.appendChild(overlay);
            
            sendResponse({ status: 'success' });
        } catch (error) {
            console.error('处理数据时出错:', error);
            sendResponse({ status: 'error', error: error.message });
        }
    }
    return true; // 保持消息通道开放
});


