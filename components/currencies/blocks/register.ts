// Side-effect module — populates the block registry. Imported once by
// `BlockRenderer` so the same instance is used everywhere. Block
// resolution falls through coin → pair (see `registry.ts`), so a coin
// component used on a pair page is automatically picked up; only the
// pair-exclusive components need `registerPairBlock`.
//
// All 16 coin block types + 2 pair-only types are registered below.

import { registerCoinBlock, registerPairBlock } from './registry';
import { ContactSupport } from './ContactSupport';
import { CurrenciesTableBlock } from './CurrenciesTableBlock';
import { CurrencyPairCoinMarketData } from './CurrencyPairCoinMarketData';
import { ExchangeAdditionalCalc } from './ExchangeAdditionalCalc';
import { ExchangeAdvantages } from './ExchangeAdvantages';
import { ExchangeRate } from './ExchangeRate';
import { ExploreAndExchangeCrypto } from './ExploreAndExchangeCrypto';
import { Faq } from './Faq';
import { HowTo } from './HowTo';
import { HowToBuySell } from './HowToBuySell';
import { LatestNews } from './LatestNews';
import { MarketInfo } from './MarketInfo';
import { MostVisitedCurrencies } from './MostVisitedCurrencies';
import { OtherOptions } from './OtherOptions';
import { PopularFiatMarkets } from './PopularFiatMarkets';
import { PriceCalculatorVertical } from './PriceCalculatorVertical';
import { PriceChart } from './PriceChart';
import { SellSupport } from './SellSupport';
import { SupportedNetworks } from './SupportedNetworks';
import { UsefulLinks } from './UsefulLinks';
import { Wallets } from './Wallets';
import { WhatIs } from './WhatIs';

// Coin blocks (also reused on pair pages via fall-through).
registerCoinBlock('currency-flow.what-is', WhatIs);
registerCoinBlock('currency-flow.how-to-buy-sell', HowToBuySell);
registerCoinBlock('currency-flow.how-to', HowTo);
registerCoinBlock('currency-flow.faq', Faq);
// `start-exchange` legacy slot — mid-page horizontal calculator with h2.
// Replaces the prior text-only `StartExchange` placeholder.
registerCoinBlock('currency-flow.start-exchange', ExchangeAdditionalCalc);
registerCoinBlock('currency-flow.exchange-advantages', ExchangeAdvantages);
registerCoinBlock('currency-flow.why-exchange-on-change-now', ExchangeAdvantages);
registerCoinBlock('currency-flow.currencies-table', CurrenciesTableBlock);
registerCoinBlock('currency-flow.contact-support', ContactSupport);
registerCoinBlock('currency-flow.price-chart', PriceChart);
registerCoinBlock('currency-flow.price-calculator-vertical', PriceCalculatorVertical);
registerCoinBlock('currency-flow.market-info', MarketInfo);
registerCoinBlock('currency-flow.wallets', Wallets);
registerCoinBlock('currency-flow.popular-fiat-markets', PopularFiatMarkets);
registerCoinBlock('currency-flow.most-visited-cryptocurrencies', MostVisitedCurrencies);
registerCoinBlock('currency-flow.supported-networks', SupportedNetworks);
// New SEO-tail blocks (always-on; see DefaultBlocks.ts).
registerCoinBlock('currency-flow.latest-news', LatestNews);
registerCoinBlock('currency-flow.sell-support', SellSupport);
registerCoinBlock('currency-flow.useful-links', UsefulLinks);
registerCoinBlock('currency-flow.explore-and-exchange-crypto', ExploreAndExchangeCrypto);

// Pair-only.
registerPairBlock('currency-flow.exchange-rate', ExchangeRate);
registerPairBlock('currency-flow.other-options', OtherOptions);
registerPairBlock('currency-flow.other-options-to-buy', OtherOptions);
registerPairBlock('currency-flow.currency-pair-coin-market-data', CurrencyPairCoinMarketData);
