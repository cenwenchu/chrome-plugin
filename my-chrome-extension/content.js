// content.js

// 获取网页的标题
const pageTitle = document.title;

// 获取网页的 URL
const pageUrl = window.location.href;

// 获取网页中所有的文本内容（示例）
const pageText = document.body.innerText;


// 获取目标元素
//document.evaluate(xpathExpression, contextNode, namespaceResolver, resultType, result)
//resultType 常量
/* resultType 参数用于指定 XPath 表达式的预期结果类型。以下是一些常用的常量：

XPathResult.ANY_TYPE: 返回任何类型的结果。
XPathResult.NUMBER_TYPE: 返回一个数字结果。
XPathResult.STRING_TYPE: 返回一个字符串结果。
XPathResult.BOOLEAN_TYPE: 返回一个布尔值结果。
XPathResult.UNORDERED_NODE_ITERATOR_TYPE: 返回一个无序的节点迭代器。
XPathResult.ORDERED_NODE_ITERATOR_TYPE: 返回一个有序的节点迭代器。
XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE: 返回一个无序的节点快照。
XPathResult.ORDERED_NODE_SNAPSHOT_TYPE: 返回一个有序的节点快照。
XPathResult.SINGLE_NODE_TYPE: 返回一个单个节点。*/

const targetElement = document.evaluate("//*[contains(@class, \"style_shopDataInfoTitle\") and text()=\"店铺资金\"]/following-sibling::*[contains(@class, \"style_shopDataInfoContainer\")]/div[1]/div[2]"
  , document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

if (targetElement) {
  // 元素存在，可以进行操作
  // 创建浮层元素
  const overlay = document.createElement('div');
  overlay.style.cssText = `
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%; /* 或固定宽度 */
  height: auto; /* 或固定高度 */
  background-color: #f0ad4e; /* 设置为黄色 */
  color: #fff; /* 设置文字颜色 */
  padding: 10px; /* 设置内边距 */
  text-align: center; /* 设置文字居中 */
  font-size: 14px; /* 设置字体大小 */
  z-index: 10; /* 设置层叠顺序 */
  opacity: 0.8; /* 设置为 50% 透明度 */
  border-radius: 10px;
`;

  // 创建文案元素
  const text = document.createElement('span');
  text.textContent = "店铺保证金：" + targetElement.textContent;

  // 将文案添加到浮层中
  overlay.appendChild(text);

  // 将浮层添加到目标元素旁边
  targetElement.parentNode.insertBefore(overlay, targetElement.nextSibling);
  //alert('元素找到了!!!!!!'+ targetElement.textContent);


} else {
  // 元素不存在，进行错误处理或提示
  console.error('元素没有找到!');
  //alert('元素没有找到!!!!!!');
}


// 将数据发送到扩展程序的其他部分（如后台脚本或弹出窗口）
chrome.runtime.sendMessage({
  type: "pageData",
  data: {
    title: pageTitle,
    url: pageUrl,
    text: pageText
  }
});