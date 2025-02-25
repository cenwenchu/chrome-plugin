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
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 12px 48px rgba(0,0,0,0.2);
                z-index: 10000;
                width: min(90%, 1000px);
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                backdrop-filter: blur(10px);
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: slideIn 0.4s cubic-bezier(0.23, 1, 0.32, 1);
            `;

            // 创建标题和关闭按钮的容器
            const headerContainer = document.createElement('div');
            headerContainer.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px; // 添加下边距
            `;

            // 创建标题
            const title = document.createElement('h2');
            title.textContent = '达人数据分析';
            title.style.cssText = `
                color: #1a1a1a;
                font-size: 28px;
                font-weight: 600;
                margin: 0;
                position: relative;
                padding-left: 12px;
            `;
            headerContainer.appendChild(title);

            // 创建关闭按钮
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '✕';
            closeButton.style.cssText = `
                border: none;
                background: rgba(0,0,0,0.05);
                cursor: pointer;
                font-size: 20px;
                color: #666;
                padding: 4px;
                transition: all 0.3s ease;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                &:hover {
                    background: rgba(0,0,0,0.1);
                    color: #333;
                    transform: scale(1.1);
                }
            `;
            closeButton.addEventListener('mouseover', () => {
                closeButton.style.color = '#333';
                closeButton.style.background = '#f5f5f5';
            });
            closeButton.addEventListener('mouseout', () => {
                closeButton.style.color = '#999';
                closeButton.style.background = 'none';
            });
            headerContainer.appendChild(closeButton);

            // 创建按钮容器
            const buttonInputContainer = document.createElement('div');
            buttonInputContainer.style.cssText = `
                display: flex;
                gap: 12px;
                margin-bottom: 20px; // 添加下边距
            `;
          

            // 增加 API Key 输入框
            const apiKeyLabel = document.createElement('label');
            apiKeyLabel.textContent = 'API Key：';
            apiKeyLabel.style.cssText = `
                font-size: 14px;
                font-weight: bold;
                color: #333;
                display: flex;
                align-items: center;
            `;
            buttonInputContainer.appendChild(apiKeyLabel);

            const apiKeyInput = document.createElement('input');
            apiKeyInput.type = 'text';
            apiKeyInput.placeholder = '请输入 API Key';
            apiKeyInput.style.cssText = `
                padding: 6px;
                border-radius: 4px;
                border: 1px solid #ccc;
                background-color: #f9f9f9;
                font-size: 14px;
                height: 36px;
                flex-grow: 1; // 允许输入框扩展
            `;
            buttonInputContainer.appendChild(apiKeyInput);

            // 从 localStorage 中加载 API Key
            const savedApiKey = localStorage.getItem('apiKey');
            if (savedApiKey) {
                apiKeyInput.value = savedApiKey; // 如果存在，填充输入框
            }

            // 在输入框失去焦点时保存 API Key
            apiKeyInput.addEventListener('blur', () => {
                localStorage.setItem('apiKey', apiKeyInput.value); // 保存到 localStorage
            });

            // 增加说明：AI模型选择
            const modelLabel = document.createElement('label');
            modelLabel.textContent = 'AI模型选择：';
            modelLabel.style.cssText = `
                font-size: 14px;
                font-weight: bold;
                color: #333;
                display: flex;
                align-items: center;
            `;
            buttonInputContainer.appendChild(modelLabel);

            const modelSelect = document.createElement('select');
            modelSelect.style.cssText = `
                padding: 6px;
                border-radius: 4px;
                border: 1px solid #ccc;
                background-color: #f9f9f9;
                font-size: 14px;
                height: 36px;
                transition: border-color 0.3s;
            `;
            modelSelect.addEventListener('focus', () => {
                modelSelect.style.borderColor = '#1677ff';
            });
            modelSelect.addEventListener('blur', () => {
                modelSelect.style.borderColor = '#ccc';
            });

            const option1 = document.createElement('option');
            option1.value = 'qwen-plus';
            option1.textContent = '阿里千问';
            const option2 = document.createElement('option');
            option2.value = 'deepseek';
            option2.textContent = 'DeepSeek-v3';
            modelSelect.appendChild(option1);
            modelSelect.appendChild(option2);

            // 创建AI分析按钮
            const aiButton = document.createElement('button');
            aiButton.innerHTML = '<span style="margin-right: 6px;">🤖</span>AI分析';
            aiButton.style.cssText = `
                padding: 8px 20px;
                background: #1677ff;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                transition: all 0.3s;
                &:hover {
                    background: #0958d9;
                }
                &:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
            `;

            // 添加模型选择框和按钮到按钮容器
            buttonInputContainer.appendChild(modelSelect);
            buttonInputContainer.appendChild(aiButton);

            

            // 创建内容区域
            const content = document.createElement('div');
            content.style.cssText = `
                background: rgba(248, 249, 249, 0.8);
                border-radius: 12px;
                padding: 24px;
                margin-top: 24px;
                overflow-y: auto;
                max-height: 60vh;
                scrollbar-width: thin;
                scrollbar-color: rgba(0,0,0,0.2) transparent;
                &::-webkit-scrollbar {
                    width: 6px;
                }
                &::-webkit-scrollbar-thumb {
                    background-color: rgba(0,0,0,0.2);
                    border-radius: 3px;
                }
            `;
            
            // 格式化数据显示
            const formattedContent = formatDataDisplay(message.data);
            content.innerHTML = formattedContent;

            // 清理之前的 AI 分析结果
            const previousResult = content.querySelector('.ai-result-container');
            if (previousResult) {
                previousResult.remove();
            }
            
            // 添加 AI 分析按钮点击事件
            aiButton.addEventListener('click', async () => {
                // 清理之前的 AI 分析结果
                const previousResult = content.querySelector('.ai-result-container');
                if (previousResult) {
                    previousResult.remove();
                }

                const selectedModel = modelSelect.value; // 获取选择的模型类型
                aiButton.disabled = true;
                aiButton.innerHTML = '<span style="margin-right: 6px;">⏳</span>分析中...';
                
                try {
                    const apiKey = apiKeyInput.value; // 从输入框获取 API Key
                    const aiResponse = await callOpenAI(selectedModel, 
                        `请分析以下达人数据，并给出详细的分析报告：${JSON.stringify(message.data)}`, apiKey);
                    
                    const aiResultContainer = document.createElement('div');
                    aiResultContainer.className = 'ai-result-container'; // 添加类名以便清理
                    aiResultContainer.style.cssText = `
                        margin-top: 20px;
                        padding: 20px;
                        background: white;
                        border-radius: 8px;
                        border: 1px solid #e8e8e8;
                    `;
                    aiResultContainer.innerHTML = `
                        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">
                            <span style="margin-right: 8px;">🤖</span>AI 分析结果
                        </h3>
                        <div style="line-height: 1.6; color: #444; white-space: pre-wrap;">
                            ${aiResponse}
                        </div>
                    `;
                    content.appendChild(aiResultContainer);
                } catch (error) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'ai-result-container'; // 添加类名以便清理
                    errorDiv.style.cssText = `
                        margin-top: 20px;
                        padding: 12px;
                        background: #fff2f0;
                        border: 1px solid #ffccc7;
                        border-radius: 8px;
                        color: #cf1322;
                    `;
                    errorDiv.innerHTML = `<span style="margin-right: 8px;">❌</span>AI分析失败: ${error.message},可以再次点击一下尝试`;
                    content.appendChild(errorDiv);
                } finally {
                    aiButton.disabled = false;
                    aiButton.innerHTML = '<span style="margin-right: 6px;">🤖</span>AI分析';
                }
            });

            // 组装浮层
            overlay.appendChild(headerContainer);
            overlay.appendChild(buttonInputContainer);
            overlay.appendChild(content);

            // 添加遮罩层
            const mask = document.createElement('div');
            mask.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(8px);
                z-index: 9999;
                animation: fadeIn 0.3s ease;
            `;

            // 添加动画样式
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -40%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
            `;
            document.head.appendChild(style);

            // 关闭事件
            const closeOverlay = () => {
                overlay.style.opacity = '0';
                mask.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s';
                mask.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    overlay.remove();
                    mask.remove();
                    style.remove();
                }, 300);
            };

            closeButton.addEventListener('click', closeOverlay);
            mask.addEventListener('click', closeOverlay);

            document.body.appendChild(mask);
            document.body.appendChild(overlay);
            
            sendResponse({ status: 'success' });
        } catch (error) {
            console.error('处理数据时出错:', error);
            sendResponse({ status: 'error', error: error.message });
        }
    }
    return true;
});

//调用aliyun的ai api
async function callOpenAI(model, content, apiKey) {
    const baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
    const endpoint = `${baseURL}/chat/completions`;

    const requestData = {
        model: model,
        messages: [
            { role: "user", content: content }
        ]
    };

    const timeout = 120000; // 120 秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const startTime = Date.now();

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const endTime = Date.now();
        console.log(`请求耗时：${(endTime - startTime) / 1000} 秒`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API返回数据：", data);
        
        return data.choices[0].message.content;
    } catch (error) {
        const endTime = Date.now();
        console.log(`请求耗时：${(endTime - startTime) / 1000} 秒`);
        console.error("请求失败：", error);
        throw error; // 将错误向上传播
    }
}

// 数据格式化显示函数
function formatDataDisplay(data) {
    // 首先深度清理数据
    
    let html = '<div class="data-container">';
    
    // 遍历清理后的数据
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
            // 如果对象为空，跳过
            if (Object.keys(value).length === 0) continue;
            
            html += `
                <div class="data-section" style="margin-bottom: 20px;">
                    <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">
                        ${formatTitle(key)}
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
            `;
            
            for (const [subKey, subValue] of Object.entries(value)) {
                html += `
                    <div class="data-item" style="
                        background: white;
                        padding: 12px;
                        border-radius: 6px;
                        border: 1px solid #e8e8e8;
                    ">
                        <div style="color: #666; font-size: 13px;">${formatTitle(subKey)}</div>
                        <div style="color: #333; font-size: 15px; margin-top: 4px; font-weight: 500;">
                            ${formatValue(subValue)}
                        </div>
                    </div>
                `;
            }
            
            html += '</div></div>';
        } else {
            html += `
                <div class="data-item" style="margin-bottom: 12px;">
                    <span style="color: #666;">${formatTitle(key)}:</span>
                    <span style="color: #333; margin-left: 8px;">${formatValue(value)}</span>
                </div>
            `;
        }
    }
    
    html += '</div>';
    return html;
}

// 格式化标题
function formatTitle(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// 格式化值
function formatValue(value) {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') {
        // 如果是大数字，添加千位分隔符
        return value.toLocaleString('zh-CN');
    }
    if (typeof value === 'boolean') return value ? '是' : '否';
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return value;
}
