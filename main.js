// 动态添加提前还款输入项
let prepayIndex = 0;
function addPrepay() {
  const prepayList = document.getElementById('prepayList');
  const div = document.createElement('div');
  div.className = 'prepay-item';
  div.innerHTML = `
    <input type="date" class="prepay-date" required>
    <input type="number" class="prepay-amount" placeholder="提前还款金额" required step="0.01">
    <button type="button" onclick="this.parentNode.remove()">删除</button>
  `;
  prepayList.appendChild(div);
}

// 计算还款明细
function calculate() {
  // 获取表单参数
  const amount = parseFloat(document.getElementById('amount').value);
  const startDate = document.getElementById('startDate').value;
  const months = parseInt(document.getElementById('months').value);
  const rate = parseFloat(document.getElementById('rate').value) / 100;

  // 获取所有提前还款
  const prepayNodes = document.querySelectorAll('.prepay-item');
  let prepayArr = [];
  prepayNodes.forEach(node => {
    const date = node.querySelector('.prepay-date').value;
    const amt = parseFloat(node.querySelector('.prepay-amount').value);
    if (date && amt > 0) {
      prepayArr.push({ date, amt });
    }
  });
  // 按日期排序
  prepayArr.sort((a, b) => a.date.localeCompare(b.date));

  // 计算明细
  const details = calcLoanDetail(amount, startDate, months, rate, prepayArr);
  renderSummary(details);
  renderTable(details);
}

// 计算等额本息还款明细，支持多次提前还款
function calcLoanDetail(amount, startDate, months, rate, prepayArr) {
  let remain = amount;
  let leftMonths = months;
  let curDate = new Date(startDate);
  let monthRate = rate / 12;
  let prepayIdx = 0;
  let result = [];

  // 计算每月还款额（等额本息公式）
  function getMonthPay(principal, n, r) {
    if (r === 0) return principal / n;
    return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }

  let monthPay = getMonthPay(remain, leftMonths, monthRate);

  for (let i = 1; i <= months && remain > 0.01; i++) {
    // 检查是否有提前还款
    let prepay = null;
    if (prepayIdx < prepayArr.length) {
      const prepayDate = new Date(prepayArr[prepayIdx].date);
      if (
        curDate.getFullYear() === prepayDate.getFullYear() &&
        curDate.getMonth() === prepayDate.getMonth()
      ) {
        prepay = prepayArr[prepayIdx];
        prepayIdx++;
      }
    }

    // 本期利息
    let interest = remain * monthRate;
    // 本期本金
    let principal = monthPay - interest;
    if (principal > remain) principal = remain;

    // 提前还款处理
    let prepayAmt = 0;
    if (prepay) {
      prepayAmt = Math.min(prepay.amt, remain - principal);
      remain -= prepayAmt;
      // 剩余期数减少1（本月已还），重新计算月供
      leftMonths = months - i;
      monthPay = leftMonths > 0 ? getMonthPay(remain - principal, leftMonths, monthRate) : 0;
    }

    result.push({
      idx: i,
      date: curDate.toISOString().slice(0, 10),
      pay: (principal + interest + prepayAmt).toFixed(2),
      principal: principal.toFixed(2),
      interest: interest.toFixed(2),
      prepay: prepayAmt.toFixed(2),
      remain: (remain - principal).toFixed(2)
    });

    remain -= principal;
    if (remain < 0.01) break;
    // 下月
    curDate.setMonth(curDate.getMonth() + 1);
  }
  return result;
}

// 渲染明细表格
function renderTable(details) {
  let html = '<table><tr><th>期数</th><th>还款日期</th><th>本息合计</th><th>本金</th><th>利息</th><th>提前还款</th><th>剩余本金</th></tr>';
  if (!details.length) {
    html += `<tr><td colspan="7" style="text-align:center;color:#bbb;">暂无还款明细</td></tr>`;
  } else {
    details.forEach(row => {
      html += `<tr>
        <td>${row.idx}</td>
        <td>${row.date}</td>
        <td>${row.pay}</td>
        <td>${row.principal}</td>
        <td>${row.interest}</td>
        <td>${row.prepay}</td>
        <td>${row.remain}</td>
      </tr>`;
    });
  }
  html += '</table>';
  document.getElementById('result').innerHTML = html;
}

// 渲染统计数据
function renderSummary(details) {
  let totalPay = 0, totalInterest = 0, totalPrepay = 0, actualPeriods = 0;
  if (details.length) {
    details.forEach(row => {
      totalPay += parseFloat(row.pay);
      totalInterest += parseFloat(row.interest);
      totalPrepay += parseFloat(row.prepay);
    });
    actualPeriods = details.length;
  }
  const summaryHtml = `
    <div class="summary-card">
      <div class="summary-label">累计还款总额</div>
      <div class="summary-value">¥ ${(totalPay || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">累计利息</div>
      <div class="summary-value">¥ ${(totalInterest || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">累计提前还款</div>
      <div class="summary-value">¥ ${(totalPrepay || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">实际还款期数</div>
      <div class="summary-value">${actualPeriods} 期</div>
    </div>
  `;
  document.getElementById('summary').innerHTML = summaryHtml;
}

// 页面加载时默认展示空明细和空汇总
window.onload = function() {
  renderSummary([]);
  renderTable([]);
}; 