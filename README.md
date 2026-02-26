# Manus 股票管理系统

基于 Manus 项目克隆的股票管理系统。

## 功能特性

- **智能选股** - 基于多信号策略的智能选股系统
- **持仓监控** - 实时监控持仓股票，检测买卖信号
- **策略分析** - 策略回测、胜率统计、操作建议
- **股票详情** - K线图、技术指标、资金流向
- **实时行情** - 东方财富热度榜

## 技术栈

- 前端: React + TypeScript + Tailwind CSS
- 路由: Wouter
- 后端: tRPC
- 数据库: MySQL (Drizzle ORM)
- 数据源: Yahoo Finance + 东方财富

## 项目结构

```
manus-stock-system/
├── src/
│   ├── components/     # UI组件
│   ├── pages/         # 页面组件
│   ├── _core/         # 核心模块
│   ├── lib/          # 工具库
│   ├── contexts/     # React上下文
│   ├── hooks/        # 自定义Hooks
│   ├── schema.ts    # 数据库Schema
│   ├── db.ts         # 数据库操作
│   ├── routers.ts   # API路由
│   ├── indicators.ts # 技术指标
│   ├── selection.ts  # 选股系统
│   ├── monitor.ts    # 监控系统
│   └── analysis.ts   # 分析系统
├── package.json
└── index.html
```

## 快速开始

1. 安装依赖:
```bash
npm install
```

2. 配置环境变量:
```bash
# 创建 .env 文件
DATABASE_URL=mysql://user:password@localhost:3306/stock_db
TUSHARE_TOKEN=your_tushare_token
```

3. 初始化数据库:
```bash
# 执行 SQL 文件创建表
mysql -u user -p stock_db < src/0001_dark_falcon.sql
```

4. 启动开发服务器:
```bash
npm run dev
```

5. 访问 http://localhost:3000

## 核心功能说明

### 选股策略
- 剔除ST股票
- 市值过滤
- 涨停板过滤
- 筹码集中度分析
- 多信号检测（跟庄买入、资金四线、CCI、MACD等）

### 监控系统
- 持仓管理
- 实时价格监控
- 买卖信号检测
- 消息推送

### 回测分析
- 单股策略回测
- 多策略对比
- 胜率统计
- 操作建议生成
