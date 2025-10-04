import os
from datetime import datetime
from typing import List, Dict, Optional
from pymongo import MongoClient
import json
from dotenv import load_dotenv
load_dotenv()
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Warning: SentenceTransformers not installed. Please run 'pip install sentence-transformers'")
    SentenceTransformer = None

TRAINING_DATA_500 = [
    # --- NEGATIVE / STOCK_DOWN (1-170) ---
    ("The Board approved a massive restructuring plan involving 15% workforce reduction across all divisions.", "STOCK_DOWN"),
    ("CEO, John Smith, resigned effective immediately following internal investigation into accounting practices.", "STOCK_DOWN"),
    ("The company determined that its previously issued financial statements for the last three quarters must be restated.", "STOCK_DOWN"),
    ("The SEC issued a formal Wells Notice regarding potential regulatory violations concerning revenue reporting.", "STOCK_DOWN"),
    ("Quarterly revenue missed analyst consensus by 12% due to unexpected supply chain disruption in Asia.", "STOCK_DOWN"),
    ("Termination of a material definitive agreement with a primary supplier, citing breach of contract and material loss of inventory.", "STOCK_DOWN"),
    ("Filed for Chapter 11 bankruptcy protection in the Delaware district court to reorganize debt obligations.", "STOCK_DOWN"),
    ("Recorded a $50 million impairment charge on intangible assets due to market slowdown and lack of expected sales.", "STOCK_DOWN"),
    ("Reported a significant data breach impacting 5 million customer financial records and payment information.", "STOCK_DOWN"),
    ("Downgraded by ratings agency Moody's due to high debt and weak cash flow forecast for the next fiscal year.", "STOCK_DOWN"),
    ("CFO announced an abrupt departure, citing 'personal reasons,' effective next week, without naming a successor.", "STOCK_DOWN"),
    ("Disclosed a material weakness in internal control over financial reporting (ICFR) impacting audit reliability.", "STOCK_DOWN"),
    ("Failed to make a scheduled interest payment on a material debt obligation, triggering a 30-day grace period.", "STOCK_DOWN"),
    ("Government denied key regulatory approval for the company's leading pharmaceutical product line, causing a major setback.", "STOCK_DOWN"),
    ("Voluntary delisting announced from the NASDAQ, moving trading to an over-the-counter market due to sustained low price.", "STOCK_DOWN"),
    ("Settled litigation at a cost of $75 million, impacting Q3 profitability and reducing cash reserves significantly.", "STOCK_DOWN"),
    ("Announced significant product line discontinuation leading to mass inventory write-off and major layoffs.", "STOCK_DOWN"),
    ("Received non-compliance notice from exchange for failure to meet minimum share price requirements for 30 consecutive days.", "STOCK_DOWN"),
    ("Class action lawsuit filed alleging massive securities fraud by senior management related to forward-looking statements.", "STOCK_DOWN"),
    ("Advisory firm recommended voting against the current management team and dissolving the existing board.", "STOCK_DOWN"),
    ("Forecasted next quarter's revenue well below market consensus due to poor reception of new products.", "STOCK_DOWN"),
    ("Key patent infringement ruling went against the company, halting sales of the core technology product.", "STOCK_DOWN"),
    ("The company is facing a material cybersecurity incident under Item 1.05 with unresolved operational impacts.", "STOCK_DOWN"),
    ("Entered into a material covenant violation for a major bank loan, requiring immediate negotiation with lenders.", "STOCK_DOWN"),
    ("Disclosed a $20 million error in historical revenue recognition dating back to the start of the fiscal year.", "STOCK_DOWN"),
    ("Major manufacturing facility fire resulting in production halt and material losses estimated at $40 million.", "STOCK_DOWN"),
    ("Received a subpoena from the Department of Justice regarding anti-competitive sales practices in the European Union.", "STOCK_DOWN"),
    ("Audit committee announced it is conducting an internal investigation into sales practices and bonuses.", "STOCK_DOWN"),
    ("Executive team compensation significantly reduced due to poor performance metrics in all revenue segments.", "STOCK_DOWN"),
    ("Sales in the largest geographic market fell 30% year-over-year due to consumer confidence issues.", "STOCK_DOWN"),
    ("The company announced a temporary suspension of its stock buyback program to preserve capital.", "STOCK_DOWN"),
    ("Unforeseen rise in raw material costs will halve projected profit margins for the next two quarters.", "STOCK_DOWN"),
    ("Competitor released a superior product, threatening 50% of market share in the most profitable sector.", "STOCK_DOWN"),
    ("Delayed filing of 10-Q report due to unexpected accounting review of revenue recognition policies.", "STOCK_DOWN"),
    ("The stock suffered a technical default on a major debt instrument, triggering acceleration clauses.", "STOCK_DOWN"),
    ("Executive Vice President of Operations unexpectedly terminated without cause, effective immediately.", "STOCK_DOWN"),
    ("Company stock was subject to a major short-seller report alleging fraudulent reporting.", "STOCK_DOWN"),
    ("Announced a massive recall of consumer products due to a severe and unexpected safety defect.", "STOCK_DOWN"),
    ("The Board rejected a hostile takeover bid at a 15% premium, citing confidence in current management.", "STOCK_DOWN"),
    ("Wrote down the entire value of a major goodwill asset acquired two years ago.", "STOCK_DOWN"),
    ("Disclosed a change in accounting principles that will significantly lower reported net income.", "STOCK_DOWN"),
    ("Failed to renew a critical operating license required to operate in three major US states.", "STOCK_DOWN"),
    ("Reported a significant slowdown in subscriber growth below the lowest analyst expectations.", "STOCK_DOWN"),
    ("A court ruling dismissed a motion critical to the company's defense in a major IP lawsuit.", "STOCK_DOWN"),
    ("The company announced the permanent closure of its flagship research and development division.", "STOCK_DOWN"),
    ("Material impairment charge due to the sale of assets at a substantial loss.", "STOCK_DOWN"),
    ("Fired Chief Technology Officer for unauthorized disclosure of proprietary information.", "STOCK_DOWN"),
    ("Received a deficiency notice from the NYSE concerning compliance with listing standards.", "STOCK_DOWN"),
    ("Announced a secondary stock offering at a price 10% below the current market rate.", "STOCK_DOWN"),
    ("The board is considering declaring bankruptcy within the next six months.", "STOCK_DOWN"),
    ("Auditors issued a warning about the company's ability to continue as a going concern.", "STOCK_DOWN"),
    ("Reported a quarterly loss that was 50% wider than the worst analyst forecast.", "STOCK_DOWN"),
    ("Termination of three material employment agreements with founding executive team members.", "STOCK_DOWN"),
    ("Management admitted key strategic goals for the year are no longer achievable.", "STOCK_DOWN"),
    ("Cancelled the launch of a highly anticipated new product indefinitely.", "STOCK_DOWN"),
    ("Received formal notice of an adverse judgment exceeding current insurance coverage limits.", "STOCK_DOWN"),
    ("The company faces a significant fine from a foreign regulator for data privacy violations.", "STOCK_DOWN"),
    ("Announced a freeze on all capital expenditure and hiring due to financial strain.", "STOCK_DOWN"),
    ("Inventory levels surged 45%, indicating poor sales and increasing carrying costs.", "STOCK_DOWN"),
    ("Disclosed potential criminal liability related to an ongoing investigation.", "STOCK_DOWN"),
    ("The resignation of the Chief Accounting Officer without a clear replacement plan.", "STOCK_DOWN"),
    ("Filed an amendment to the 8-K to correct materially false prior financial disclosure.", "STOCK_DOWN"),
    ("The company's guidance was withdrawn entirely due to market uncertainty and internal problems.", "STOCK_DOWN"),
    ("New state legislation will severely restrict the company's primary business model.", "STOCK_DOWN"),
    ("A major competitor launched a direct pricing war in the most profitable segment.", "STOCK_DOWN"),
    ("Announced a deferral of product delivery dates by at least two quarters due to production issues.", "STOCK_DOWN"),
    ("Material increase in warranty claims suggesting a major quality control failure.", "STOCK_DOWN"),
    ("The board initiated a search for replacements for three directors immediately.", "STOCK_DOWN"),
    ("Internal debt audit revealed unbooked liabilities totaling $10 million.", "STOCK_DOWN"),
    ("The company admitted that its guidance was based on unrealistic growth projections.", "STOCK_DOWN"),
    ("A material contract termination led to an immediate revision of revenue forecast.", "STOCK_DOWN"),
    ("Company suspended dividend payments indefinitely to preserve cash flow.", "STOCK_DOWN"),
    ("Reported the most significant quarterly cash burn in company history.", "STOCK_DOWN"),
    ("Failed to disclose a material related-party transaction with an executive.", "STOCK_DOWN"),
    ("The company is undergoing a mandatory and disruptive government environmental review.", "STOCK_DOWN"),
    ("Stock trading was temporarily halted by the exchange due to information asymmetry.", "STOCK_DOWN"),
    ("Disclosed material litigation losses expected to exceed $100 million.", "STOCK_DOWN"),
    ("The acquisition deal with 'Target Co.' was terminated due to inability to secure funding.", "STOCK_DOWN"),
    ("Announced a major executive payout despite missing all operational targets.", "STOCK_DOWN"),
    ("Restructuring costs increased by 50% over the original estimate.", "STOCK_DOWN"),
    ("The company lost its primary government certification required for operations.", "STOCK_DOWN"),
    ("Disclosed massive executive compensation changes linked to non-GAAP metrics.", "STOCK_DOWN"),
    ("Auditor resigned following disagreements over the company's revenue recognition timing.", "STOCK_DOWN"),
    ("Company reduced its market capitalization by issuing a large number of deeply discounted shares.", "STOCK_DOWN"),
    ("Material weakness cited by auditors regarding cybersecurity risk management.", "STOCK_DOWN"),
    ("Reported a significant drop in future committed revenue bookings.", "STOCK_DOWN"),
    ("The board initiated a review of financial controls after an internal whistleblower complaint.", "STOCK_DOWN"),
    ("Sustained negative media coverage regarding product safety issues.", "STOCK_DOWN"),
    ("Announced the abandonment of a major new market entry strategy.", "STOCK_DOWN"),
    ("Reported significant asset write-downs in the Asian segment.", "STOCK_DOWN"),
    ("The company is facing several material anti-trust inquiries in Europe.", "STOCK_DOWN"),
    ("Investor relations executive was terminated after providing selective guidance.", "STOCK_DOWN"),
    ("The company acknowledged that regulatory risks were understated in prior filings.", "STOCK_DOWN"),
    ("Failed to disclose a change in control clause that was triggered by the debt default.", "STOCK_DOWN"),
    ("Inventory value marked down due to obsolescence and slow movement.", "STOCK_DOWN"),
    ("Major shareholder initiated a proxy contest to replace the entire management team.", "STOCK_DOWN"),
    ("Announced a delay in filing the annual 10-K report with the SEC.", "STOCK_DOWN"),
    ("Reported a significant slowdown in customer payment collections (accounts receivable).", "STOCK_DOWN"),
    ("The company is under a material investigation by the Department of Labor.", "STOCK_DOWN"),
    ("A key executive sold $50 million in stock three days before a negative news release.", "STOCK_DOWN"),
    ("Disclosed that sales figures were misleadingly inflated in internal reports.", "STOCK_DOWN"),
    ("Company announced plans to file for administration or a similar insolvency proceeding.", "STOCK_DOWN"),
    ("Massive regulatory fine imposed by the EPA for environmental violations.", "STOCK_DOWN"),
    ("The Chief Operating Officer was placed on immediate administrative leave.", "STOCK_DOWN"),
    ("Announced a material downward revision of its long-term growth outlook.", "STOCK_DOWN"),
    ("The auditor expressed significant doubts about the company's ability to remain solvent.", "STOCK_DOWN"),
    ("Management admitted they failed to properly reserve for future legal liabilities.", "STOCK_DOWN"),
    ("Reported major asset liquidations at deeply discounted fire sale prices.", "STOCK_DOWN"),
    ("The company is withdrawing from a major joint venture agreement immediately.", "STOCK_DOWN"),
    ("Disclosed that a major technological initiative has been a complete failure.", "STOCK_DOWN"),
    ("Failed to disclose the total costs associated with the last acquisition.", "STOCK_DOWN"),
    ("The Board voted unanimously to remove the current CEO due to performance issues.", "STOCK_DOWN"),
    ("A significant portion of the company's debt has been downgraded to junk status.", "STOCK_DOWN"),
    ("Announced unexpected delays in securing financing for a critical new project.", "STOCK_DOWN"),
    ("The key technology patent has been invalidated by the patent office.", "STOCK_DOWN"),
    ("Received a cease-and-desist letter from a competitor over core technology.", "STOCK_DOWN"),
    ("Reported a major loss in market share to new entrants in the last quarter.", "STOCK_DOWN"),
    ("The company announced a significant increase in legal contingency reserves.", "STOCK_DOWN"),
    ("The founder and chief visionary officer announced they are stepping down next month.", "STOCK_DOWN"),
    ("Disclosed a highly dilutive private placement financing at a low valuation.", "STOCK_DOWN"),
    ("Filed an 8-K disclosing that prior non-GAAP figures are unreliable.", "STOCK_DOWN"),
    ("A material lawsuit was certified as a class action against the company.", "STOCK_DOWN"),
    ("The entire senior management team received adverse performance reviews from the board.", "STOCK_DOWN"),
    ("Announced the termination of several hundred contractor agreements abruptly.", "STOCK_DOWN"),
    ("Reported rising costs due to unforeseen environmental cleanup liabilities.", "STOCK_DOWN"),
    ("The company failed to meet the conditions of its latest financing round.", "STOCK_DOWN"),
    ("New government regulations are expected to drastically cut product profitability.", "STOCK_DOWN"),
    ("The stock dropped 25% on the morning of the filing due to the news contents.", "STOCK_DOWN"),
    ("Major investment bank closed its research coverage due to valuation concerns.", "STOCK_DOWN"),
    ("Reported declining average revenue per user (ARPU) across all segments.", "STOCK_DOWN"),
    ("Disclosed a significant contingent liability related to a tax audit.", "STOCK_DOWN"),
    ("The company is exploring strategic alternatives including a potential sale or break-up.", "STOCK_DOWN"),
    ("Received an unsolicited, non-binding takeover proposal at a very low price.", "STOCK_DOWN"),
    ("Announced the resignation of the Chief Human Resources Officer amidst scandal.", "STOCK_DOWN"),
    ("Key product shipment was delayed indefinitely due to a regulatory investigation.", "STOCK_DOWN"),
    ("The company admitted to inflated metrics in its investor presentations.", "STOCK_DOWN"),
    ("Major credit card processing partner suspended services due to high fraud rates.", "STOCK_DOWN"),
    ("Auditor issued a formal warning about deficiencies in internal controls.", "STOCK_DOWN"),
    ("The company announced a pivot away from its historical core business model.", "STOCK_DOWN"),
    ("A material portion of executive equity awards will be forfeited due to non-performance.", "STOCK_DOWN"),
    ("The company disclosed a severe liquidity crunch requiring emergency measures.", "STOCK_DOWN"),
    ("Reported a complete failure of the last major product launch strategy.", "STOCK_DOWN"),
    ("Management failed to provide any forward-looking guidance for the year.", "STOCK_DOWN"),
    ("The largest customer announced they are moving to a competitor next quarter.", "STOCK_DOWN"),
    ("The company faces a significant penalty for non-compliance with the Foreign Corrupt Practices Act.", "STOCK_DOWN"),
    ("Announced the closure of all retail locations due to sustained operating losses.", "STOCK_DOWN"),
    ("Reported a material breach of contract with a co-development partner.", "STOCK_DOWN"),
    ("The company is initiating material litigation against a major supply chain partner.", "STOCK_DOWN"),
    ("Received a termination notice from the stock exchange for failure to file timely financial reports.", "STOCK_DOWN"),
    ("The company admitted the impairment charge was higher than initially anticipated.", "STOCK_DOWN"),
    ("Filed a revised prospectus detailing increased operational risks.", "STOCK_DOWN"),
    ("The compensation committee canceled all performance-based stock awards for the year.", "STOCK_DOWN"),
    ("Reported a substantial loss of intellectual property due to an internal leak.", "STOCK_DOWN"),
    ("The company announced a complete halt on new product development.", "STOCK_DOWN"),
    ("Disclosed material non-compliance with environmental safety standards.", "STOCK_DOWN"),
    ("The Chief Marketing Officer was removed for engaging in unethical advertising practices.", "STOCK_DOWN"),
    ("Reported a failure to secure key talent necessary for future growth initiatives.", "STOCK_DOWN"),
    ("The entire board of directors received a negative recommendation from a proxy advisory firm.", "STOCK_DOWN"),
    ("Announced a new debt financing agreement with punitive, high-interest terms.", "STOCK_DOWN"),
    ("The core business unit saw its revenue drop by 20% in the last fiscal period.", "STOCK_DOWN"),
    ("Disclosed a large contingent liability from an ongoing product liability lawsuit.", "STOCK_DOWN"),
    ("The company is facing an investigation into potential money laundering activities.", "STOCK_DOWN"),
    ("A major institutional investor sold its entire stake in the company overnight.", "STOCK_DOWN"),
    ("Announced a change in market strategy that involves substantial upfront costs.", "STOCK_DOWN"),
    ("The cost of capital has increased significantly due to recent negative events.", "STOCK_DOWN"),
    ("Reported a significant decline in website traffic and new customer sign-ups.", "STOCK_DOWN"),
    ("The company's primary patent protection is set to expire without renewal.", "STOCK_DOWN"),
    ("Management cited severe economic headwinds impacting all operational forecasts.", "STOCK_DOWN"),
    ("Disclosed a material failure in integrating the technology from the last acquisition.", "STOCK_DOWN"),
    ("The company announced it would require significant external capital to continue operating.", "STOCK_DOWN"),
    ("Received formal notification that a key regulatory license will not be renewed.", "STOCK_DOWN"),
    ("The board is exploring delisting the stock to avoid public disclosure requirements.", "STOCK_DOWN"),
    ("Major investment funds announced they are reducing their exposure to the stock.", "STOCK_DOWN"),
    ("Reported a massive increase in tax liability due to an adverse ruling.", "STOCK_DOWN"),
    ("The company terminated its definitive agreement to acquire 'Target Co.', incurring a breakup fee.", "STOCK_DOWN"),
    ("Disclosed that the value of its cryptocurrency holdings was completely impaired.", "STOCK_DOWN"),
    ("The former CEO has filed a wrongful termination lawsuit against the company.", "STOCK_DOWN"),
    ("Company suspended all research and development activities to cut costs.", "STOCK_DOWN"),


    # --- POSITIVE / STOCK_UP (171-335) ---
    ("Acquired competitor 'Globex' for $500M cash, immediately boosting market share by 25%.", "STOCK_UP"),
    ("Q4 earnings per share exceeded analyst estimates by 20% and raised full-year guidance.", "STOCK_UP"),
    ("The Board approved a 3-for-1 stock split to take effect next month, signaling confidence.", "STOCK_UP"),
    ("Company received FDA approval for its flagship product, enabling immediate sales launch and large volume orders.", "STOCK_UP"),
    ("Entered into a material definitive agreement with a major government agency for a 5-year, $1B contract.", "STOCK_UP"),
    ("Announced a new $10 billion share repurchase program, demonstrating financial strength and commitment to shareholders.", "STOCK_UP"),
    ("Signed a definitive merger agreement with 'TechCorp' at a 40% premium to current share price.", "STOCK_UP"),
    ("Received a major analyst upgrade from 'Neutral' to 'Strong Buy' based on expected market capture.", "STOCK_UP"),
    ("Patent infringement lawsuit concluded in the company's favor, awarding $150M in damages and securing IP.", "STOCK_UP"),
    ("Appointed a highly regarded industry veteran, Jane Doe, as the new CEO, leading to strong investor optimism.", "STOCK_UP"),
    ("Acquired all remaining outstanding shares of Subsidiary X, achieving full ownership and operational synergy.", "STOCK_UP"),
    ("Settled all outstanding regulatory inquiries with no penalties assessed, clearing a major overhang risk.", "STOCK_UP"),
    ("Successfully refinanced all short-term debt at a significantly lower interest rate, reducing future debt expense.", "STOCK_UP"),
    ("Announced a partnership with a global leader to distribute products worldwide, expanding geographic reach.", "STOCK_UP"),
    ("Unveiled a revolutionary new product expected to disrupt the entire industry and capture substantial market share.", "STOCK_UP"),
    ("Raised full-year revenue guidance based on stronger-than-expected Q1 sales momentum and efficiency gains.", "STOCK_UP"),
    ("The acquisition of key assets in the European market has been completed successfully.", "STOCK_UP"),
    ("Credit rating was upgraded by S&P, lowering the cost of future borrowing and signaling financial stability.", "STOCK_UP"),
    ("Entered into a licensing agreement expected to generate $200M in annual royalty income for core IP.", "STOCK_UP"),
    ("Major hedge fund disclosed a new 9.9% activist stake in the company, signaling potential upside value.", "STOCK_UP"),
    ("Stock dividend declared, providing an immediate return to shareholders and boosting share attractiveness.", "STOCK_UP"),
    ("Announced a new, highly effective COVID-19 therapeutic received emergency use authorization.", "STOCK_UP"),
    ("Received a major tax incentive package from the state to build a new factory, lowering operational costs.", "STOCK_UP"),
    ("Successfully launched debt offering to pay down higher interest obligations, optimizing capital structure.", "STOCK_UP"),
    ("Reached all targets in restructuring plan ahead of schedule, resulting in significant immediate cost savings.", "STOCK_UP"),
    ("Announced plans to pay off all outstanding short-term liabilities next quarter using free cash flow.", "STOCK_UP"),
    ("New technology patent granted, securing market dominance for 20 years in the core sector.", "STOCK_UP"),
    ("Reported record operating margins driven by efficiency and scale, far surpassing peer averages.", "STOCK_UP"),
    ("New, highly valuable mineral discovery reported on company-owned land, dramatically increasing asset value.", "STOCK_UP"),
    ("Secured $150 million in new venture capital funding, validating the long-term growth plan.", "STOCK_UP"),
    ("Completed the disposition of non-core assets at a significant profit, streamlining operations.", "STOCK_UP"),
    ("Elected a new board member known for successful technology investments, promising new guidance.", "STOCK_UP"),
    ("Announced strong year-end results for both revenue and customer growth, exceeding all internal goals.", "STOCK_UP"),
    ("New 10b5-1 plan adopted, showing predictable schedule for executive trades well away from major events.", "STOCK_UP"),
    ("Successfully defended a major class action lawsuit with no damages awarded, removing a liability cloud.", "STOCK_UP"),
    ("Announced partnership with industry giant 'GlobalCom' for product co-development.", "STOCK_UP"),
    ("Received approval to list securities on a major European stock exchange.", "STOCK_UP"),
    ("Exceeded Q3 customer acquisition target by 35% due to effective marketing strategy.", "STOCK_UP"),
    ("Entered into a final, binding agreement for the sale of a major subsidiary at a premium valuation.", "STOCK_UP"),
    ("Forecasted long-term annual revenue growth exceeding 25%.", "STOCK_UP"),
    ("Acquisition of a strategic patent portfolio was completed, blocking key competitors.", "STOCK_UP"),
    ("Received confirmation that a major debt covenant was fully satisfied early.", "STOCK_UP"),
    ("Announced a special, one-time cash dividend to shareholders.", "STOCK_UP"),
    ("Reported a significant increase in free cash flow, exceeding previous company records.", "STOCK_UP"),
    ("The company successfully completed its transition to a fully self-hosted cloud environment.", "STOCK_UP"),
    ("Received the highest safety rating from the government for all product lines.", "STOCK_UP"),
    ("Successful launch of a new subscription service expected to add $50M in recurring revenue.", "STOCK_UP"),
    ("A renowned tech leader joined the board of directors.", "STOCK_UP"),
    ("Announced plans to expand production capacity by 50% to meet soaring demand.", "STOCK_UP"),
    ("Signed a major distribution deal in the untapped Latin American market.", "STOCK_UP"),
    ("Disclosed that the restructuring costs were lower than initially forecast.", "STOCK_UP"),
    ("The Board authorized an increase in the current share repurchase program by $5 billion.", "STOCK_UP"),
    ("Company achieved key technical milestone two months ahead of the publicly stated schedule.", "STOCK_UP"),
    ("Reported a significant reduction in churn rate for subscription customers.", "STOCK_UP"),
    ("Successfully completed a spin-off of a subsidiary, unlocking shareholder value.", "STOCK_UP"),
    ("Received a material tax refund from the federal government.", "STOCK_UP"),
    ("Final regulatory hurdle cleared for the key product launch in the U.S.", "STOCK_UP"),
    ("Announced a partnership with a major logistics firm to improve delivery times.", "STOCK_UP"),
    ("The acquisition target's operational performance exceeded all synergy expectations.", "STOCK_UP"),
    ("Increased profit margin forecasts due to favorable commodity price changes.", "STOCK_UP"),
    ("Key executive received a major industry award, boosting company image.", "STOCK_UP"),
    ("The company won a competitive bid for a high-value government contract.", "STOCK_UP"),
    ("Signed a long-term supply contract securing low prices for essential raw materials.", "STOCK_UP"),
    ("Announced that a new product line achieved market saturation faster than expected.", "STOCK_UP"),
    ("The board approved a significant capital investment into R&D for a new segment.", "STOCK_UP"),
    ("The company is launching a major product upgrade that solves a key customer pain point.", "STOCK_UP"),
    ("Reported successful defense against a major patent challenge.", "STOCK_UP"),
    ("Announced the closing of a low-interest credit facility for operational expansion.", "STOCK_UP"),
    ("The company's stock was added to the S&P 500 index.", "STOCK_UP"),
    ("Disclosed a significant reduction in outstanding debt balance.", "STOCK_UP"),
    ("Successfully migrated all core IT systems to a new platform ahead of schedule.", "STOCK_UP"),
    ("The company received several non-binding acquisition proposals at high valuations.", "STOCK_UP"),
    ("Announced strong sales during the holiday quarter, beating all guidance estimates.", "STOCK_UP"),
    ("Secured exclusive rights to a breakthrough technology developed by a university.", "STOCK_UP"),
    ("The board confirmed that current financial guidance remains firmly on track.", "STOCK_UP"),
    ("Acquisition of a manufacturing plant in Mexico significantly lowered labor costs.", "STOCK_UP"),
    ("Completed the disposition of a troubled asset, removing future financial liability.", "STOCK_UP"),
    ("Received an unsolicited takeover offer at a premium of $50 per share.", "STOCK_UP"),
    ("Announced that the CEO purchased $5 million worth of common stock on the open market.", "STOCK_UP"),
    ("Reported a significant improvement in year-over-year inventory turnover.", "STOCK_UP"),
    ("The company has met all requirements to receive a major government subsidy.", "STOCK_UP"),
    ("Announced a technology licensing deal expected to secure long-term revenue.", "STOCK_UP"),
    ("The company successfully converted all convertible debt into equity.", "STOCK_UP"),
    ("Received overwhelming shareholder approval for all management proposals.", "STOCK_UP"),
    ("Audit committee confirmed the reliability of all prior financial disclosures.", "STOCK_UP"),
    ("Announced a new, higher payout ratio for its quarterly dividend.", "STOCK_UP"),
    ("The company completed a secondary offering that was oversubscribed by 200%.", "STOCK_UP"),
    ("Major investment bank upgraded its price target on the stock by 50%.", "STOCK_UP"),
    ("Reported a significant increase in international sales volume.", "STOCK_UP"),
    ("Disclosed that insurance payouts for a recent loss were higher than anticipated.", "STOCK_UP"),
    ("The company acquired a key intellectual property asset from a distressed seller.", "STOCK_UP"),
    ("Announced that a major regulatory restriction was lifted, opening up a new market.", "STOCK_UP"),
    ("New CFO appointed with a reputation for financial discipline and cost control.", "STOCK_UP"),
    ("Successfully launched a new digital platform ahead of schedule and under budget.", "STOCK_UP"),
    ("The entire executive team received a strong endorsement from a proxy advisory firm.", "STOCK_UP"),
    ("Secured favorable new terms on existing revolving credit facility.", "STOCK_UP"),
    ("Announced a new strategic plan focusing on high-margin recurring revenue.", "STOCK_UP"),
    ("Reported a successful outcome in a major product regulatory review.", "STOCK_UP"),
    ("The company reduced its tax rate through strategic international adjustments.", "STOCK_UP"),
    ("Major competitor's core patent was successfully challenged and invalidated.", "STOCK_UP"),
    ("Announced the acquisition of the technology startup 'NextGen' for $100M.", "STOCK_UP"),
    ("The company reported achieving its first ever quarter of positive free cash flow.", "STOCK_UP"),
    ("Received strong initial pre-order sales for the newly launched product line.", "STOCK_UP"),
    ("Signed a major distribution partnership agreement in the Chinese market.", "STOCK_UP"),
    ("Announced an early repayment of principal on long-term debt.", "STOCK_UP"),
    ("The company has received an expression of interest for a potential merger.", "STOCK_UP"),
    ("Elected a board member who is a former high-ranking government official.", "STOCK_UP"),
    ("Announced plans to increase investment in high-growth R&D initiatives.", "STOCK_UP"),
    ("Reported a dramatic turnaround in operational efficiency metrics.", "STOCK_UP"),
    ("The company successfully petitioned for lower environmental compliance standards.", "STOCK_UP"),
    ("The board approved accelerated vesting for certain employee stock options.", "STOCK_UP"),
    ("Reported that Q1 revenue will exceed all previous internal expectations.", "STOCK_UP"),
    ("Announced a material joint venture agreement to develop a new market.", "STOCK_UP"),
    ("Successfully integrated the technology from the last acquisition, realizing full synergies.", "STOCK_UP"),
    ("The company completed a secondary stock offering at a strong premium to market price.", "STOCK_UP"),
    ("Received a significant, favorable ruling in a long-standing intellectual property dispute.", "STOCK_UP"),
    ("Reported an annual increase in dividend payout for the tenth consecutive year.", "STOCK_UP"),
    ("The acquisition target's CEO is joining the management team.", "STOCK_UP"),
    ("Announced a program to buy back debt at a deep discount, saving interest costs.", "STOCK_UP"),


    # --- NEUTRAL (336-500) ---
    ("Appointed new Chief Legal Officer, Jane Doe, with deep experience in compliance.", "NEUTRAL"),
    ("Amendment to the company's bylaws regarding shareholder meeting procedures.", "NEUTRAL"),
    ("Routine change of certifying accountant, citing partner rotation requirements.", "NEUTRAL"),
    ("The Board nominated a candidate for election as a Director at the annual meeting.", "NEUTRAL"),
    ("Adopted a minor amendment to the Code of Ethics and Conduct for employees.", "NEUTRAL"),
    ("Issued a press release regarding a non-material update to product inventory levels.", "NEUTRAL"),
    ("Filed an Item 7.01 to satisfy Regulation FD regarding non-material Q1 forecasts.", "NEUTRAL"),
    ("The company made a voluntary disclosure regarding routine sales targets for the next year.", "NEUTRAL"),
    ("Change of the fiscal year-end date from September 30 to December 31 for administrative purposes.", "NEUTRAL"),
    ("Approved non-material compensation arrangements for new, non-principal officer.", "NEUTRAL"),
    ("Announced the date and agenda for the next Annual Meeting of Shareholders.", "NEUTRAL"),
    ("Notice of delisting received, immediately followed by the transfer to a different exchange.", "NEUTRAL"),
    ("Temporary suspension of trading under the registrant's employee benefit plans due to standard blackout period.", "NEUTRAL"),
    ("Non-material amendment to the Articles of Incorporation regarding share classes.", "NEUTRAL"),
    ("Routine issuance of common stock under a pre-existing employee stock plan.", "NEUTRAL"),
    ("Filed standard explanatory material related to proxy voting.", "NEUTRAL"),
    ("Announced the retirement of a long-serving, non-executive director.", "NEUTRAL"),
    ("Entered into a routine, non-material indemnification agreement with a director.", "NEUTRAL"),
    ("Filed exhibits required by Item 9.01 related to a previous filing.", "NEUTRAL"),
    ("Announced a slight modification to the company's corporate governance guidelines.", "NEUTRAL"),
    ("Completed the filing of audited financial statements for a prior year.", "NEUTRAL"),
    ("Submitted a routine filing under Regulation FD regarding general economic trends.", "NEUTRAL"),
    ("No material definitive agreements were entered into or terminated during the reporting period.", "NEUTRAL"),
    ("The Compensation Committee approved the terms of a routine annual bonus plan.", "NEUTRAL"),
    ("The company's independent registered public accounting firm affirmed its reliance.", "NEUTRAL"),
    ("A director was appointed to an existing committee of the Board.", "NEUTRAL"),
    ("Filed a proxy statement solely for the purpose of seeking shareholder approval on a routine matter.", "NEUTRAL"),
    ("Issued a clarification press release regarding a minor operational event.", "NEUTRAL"),
    ("Announcement of the termination of a non-material operating lease.", "NEUTRAL"),
    ("The company's registration statement on Form S-3 became automatically effective.", "NEUTRAL"),
    ("The Board approved minor adjustments to the general corporate risk factors disclosure.", "NEUTRAL"),
    ("Appointed an independent director to fill a vacant position on the Audit Committee.", "NEUTRAL"),
    ("Filed a Form 8-K to report the change of the company's principal executive offices address.", "NEUTRAL"),
    ("Announced the issuance of non-voting preferred stock to a private investor.", "NEUTRAL"),
    ("Submitted an Item 7.01 disclosure confirming a previously stated revenue range.", "NEUTRAL"),
    ("The company corrected a technical error in a previously filed proxy statement.", "NEUTRAL"),
    ("Filed a routine S-8 registration statement for shares related to employee compensation.", "NEUTRAL"),
    ("The Board approved a change in the quarterly meeting schedule.", "NEUTRAL"),
    ("Announced the resignation of a non-principal officer for administrative reasons.", "NEUTRAL"),
    ("Issued a press release clarifying a non-material point made during an earnings call.", "NEUTRAL"),
    ("Filed a final prospectus supplement for a previously announced stock offering.", "NEUTRAL"),
    ("The company amended its employee stock purchase plan (ESPP) rules slightly.", "NEUTRAL"),
    ("A non-executive director was appointed to the Nominating and Governance Committee.", "NEUTRAL"),
    ("Announced the formation of a new internal task force focused on efficiency.", "NEUTRAL"),
    ("The company established a small, routine line of credit with a local bank.", "NEUTRAL"),
    ("Filed a Schedule 14A reporting a routine change in the date of the annual meeting.", "NEUTRAL"),
    ("The board ratified the compensation plan for non-executive directors.", "NEUTRAL"),
    ("The company announced a minor policy change regarding employee expense reporting.", "NEUTRAL"),
    ("Submitted an Item 8.01 voluntary disclosure concerning market visibility.", "NEUTRAL"),
    ("The company filed a Form 8-K/A to amend a non-material exhibit list.", "NEUTRAL"),
    ("The Chairman of the Board issued a letter to shareholders discussing governance principles.", "NEUTRAL"),
    ("Announced a routine renewal of a non-material contract with a vendor.", "NEUTRAL"),
    ("Filed a document detailing the final votes cast at the annual shareholder meeting.", "NEUTRAL"),
    ("The company disclosed routine updates to its insider trading policy blackout windows.", "NEUTRAL"),
    ("Approved the annual operating budget for the non-core technology division.", "NEUTRAL"),
    ("Announced the hiring of a new Vice President of Investor Relations.", "NEUTRAL"),
    ("The company has engaged a new public relations firm for general corporate communications.", "NEUTRAL"),
    ("Filed a routine notification regarding the transfer of its listing agent.", "NEUTRAL"),
    ("A new independent auditor was engaged for a non-material subsidiary.", "NEUTRAL"),
    ("The board approved the routine annual equity awards for non-executive employees.", "NEUTRAL"),
    ("Announced a minor strategic shift in customer support operations.", "NEUTRAL"),
    ("The company completed its quarterly filings without any material changes or restatements.", "NEUTRAL"),
    ("Filed a notice stating that the stock is now compliant with all listing standards.", "NEUTRAL"),
    ("The compensation committee formally granted annual routine stock options to employees.", "NEUTRAL"),
    ("Announced a minor revision to the dividend reinvestment plan (DRIP).", "NEUTRAL"),
    ("The company's articles of incorporation were amended to reflect a non-material name change.", "NEUTRAL"),
    ("Submitted a Form 8-K to correct a typographic error in a previous filing.", "NEUTRAL"),
    ("The Board approved the sale of a non-material land asset for fair market value.", "NEUTRAL"),
    ("Announced a new director appointment to replace a director who reached the mandatory retirement age.", "NEUTRAL"),
    ("Filed an Item 7.01 disclosure about upcoming investor presentations.", "NEUTRAL"),
    ("The company reported a slight increase in operating expenses related to office maintenance.", "NEUTRAL"),
    ("A routine warrant exercise by a non-controlling shareholder.", "NEUTRAL"),
    ("The company disclosed non-material information to comply with Regulation FD.", "NEUTRAL"),
    ("Announced the routine hiring of a new regional sales manager.", "NEUTRAL"),
    ("The board formally adopted a new set of general internal committee charters.", "NEUTRAL"),
    ("Filed a document confirming that no events under Section 2 occurred.", "NEUTRAL"),
    ("The company announced the date for its next regularly scheduled board meeting.", "NEUTRAL"),
    ("The company's CEO provided a general industry outlook at a financial conference.", "NEUTRAL"),
    ("The board approved a small charitable donation on behalf of the company.", "NEUTRAL"),
    ("Filed an exhibit containing a non-material update to an employee handbook.", "NEUTRAL"),
    ("The company disclosed routine compensation arrangements for mid-level management.", "NEUTRAL"),
    ("Announced the appointment of a new Vice President of Corporate Strategy.", "NEUTRAL"),
    ("The company reported a standard delay in receiving a regulatory update.", "NEUTRAL"),
    ("Filed a routine notice regarding the change in treasury stock holdings.", "NEUTRAL"),
    ("The independent auditors provided a clean opinion on the financial controls.", "NEUTRAL"),
    ("The company established a new committee to study long-term environmental goals.", "NEUTRAL"),
    ("The board confirmed that all standing committees are fully staffed.", "NEUTRAL"),
    ("Announced a minor modification to the structure of the R&D department.", "NEUTRAL"),
    ("The company's existing debt facility was routinely extended for another year.", "NEUTRAL"),
    ("Filed an Item 8.01 to disclose immaterial details about a customer service change.", "NEUTRAL"),
    ("The company reported a standard increase in its general administrative costs.", "NEUTRAL"),
    ("A non-material asset sale was completed, generating a small profit.", "NEUTRAL"),
    ("The compensation committee formally reviewed the annual performance goals.", "NEUTRAL"),
    ("Announced a minor change in the vesting schedule for non-executive employees.", "NEUTRAL"),
    ("The company's new Chief Information Officer officially started their position.", "NEUTRAL"),
    ("Filed a document confirming a standard renewal of key commercial insurance policies.", "NEUTRAL"),
    ("The board adopted a new policy for director nominations and diversity.", "NEUTRAL"),
    ("The company issued a press release on its non-material quarterly earnings date.", "NEUTRAL"),
    ("Submitted a Form 8-K to include the latest version of the company logo.", "NEUTRAL"),
    ("The board approved the annual budget for standard software license renewals.", "NEUTRAL"),
    ("Announced a routine internal transfer of assets between two subsidiaries.", "NEUTRAL"),
    ("The company's independent lead director was re-elected for another term.", "NEUTRAL"),
    ("Filed an exhibit containing a non-material organizational chart update.", "NEUTRAL"),
    ("The company disclosed standard information about its dividend payment process.", "NEUTRAL"),
    ("The Compensation Committee awarded a routine number of restricted stock units (RSUs) to directors.", "NEUTRAL"),
    ("Announced a minor change in its product warranty terms.", "NEUTRAL"),
    ("The company's stock was transferred to a new trading market within the same exchange.", "NEUTRAL"),
    ("Submitted an Item 7.01 disclosure confirming prior, non-material financial statements.", "NEUTRAL"),
    ("The board approved the appointment of a new non-executive director.", "NEUTRAL"),
    ("The company filed a document detailing the final tally of director votes.", "NEUTRAL"),
    ("Announced a minor adjustment to its capital allocation strategy.", "NEUTRAL"),
    ("The company entered into a routine non-material office lease agreement.", "NEUTRAL"),
    ("Filed an 8-K to report the non-material transfer of shares to an employee trust.", "NEUTRAL"),
    ("The company disclosed minor updates to its legal counsel team.", "NEUTRAL"),
    ("The board ratified the annual engagement letter with the certifying public accountant.", "NEUTRAL"),
    ("The company announced the routine granting of options under a pre-approved plan.", "NEUTRAL"),
    ("Filed a Form 8-K to confirm the accuracy of a recent press release.", "NEUTRAL"),
    ("The company issued a non-material update regarding its environmental targets.", "NEUTRAL"),
    ("A long-term executive changed their title without a change in duties or compensation.", "NEUTRAL"),
    ("The company's chief information security officer was formally appointed.", "NEUTRAL"),
    ("The board formally adopted a new policy on share retention for executives.", "NEUTRAL"),
    ("Filed an Item 8.01 disclosure regarding general market trends in the industry.", "NEUTRAL"),
    ("The company announced a small increase in its workforce size in a non-core region.", "NEUTRAL"),
    ("The board approved a standard amendment to the non-executive director compensation policy.", "NEUTRAL"),
    ("Filed an exhibit containing the routine updated list of company subsidiaries.", "NEUTRAL"),
    ("The company disclosed minor changes in its product liability reserves.", "NEUTRAL"),
    ("Announced a routine expiration of a non-material customer contract.", "NEUTRAL"),
    ("The board reviewed the annual strategic plan and provided non-binding feedback.", "NEUTRAL"),
    ("The company's auditor confirmed its independence in a routine filing.", "NEUTRAL"),
    ("Filed a Form 8-K to correct a non-material formatting error in a prior filing.", "NEUTRAL"),
    ("The company voluntarily disclosed details of its employee wellness program.", "NEUTRAL"),
    ("A director disclosed the sale of a small number of shares under a pre-arranged 10b5-1 plan.", "NEUTRAL"),
    ("The company is providing supplemental information regarding its ESG strategy.", "NEUTRAL"),
    ("Announced the routine conversion of preferred stock into common stock.", "NEUTRAL"),
    ("The board approved standard increases to director retainer fees.", "NEUTRAL"),
    ("The company filed a document confirming the date of its next scheduled earnings call.", "NEUTRAL"),
    ("A non-material debt instrument matured and was paid off routinely.", "NEUTRAL"),
    ("The company made a voluntary disclosure concerning minor operational updates.", "NEUTRAL"),
    ("Filed an 8-K to file an exhibit required by a technical SEC rule.", "NEUTRAL"),
    ("The company issued a statement confirming adherence to standard industry practices.", "NEUTRAL"),
    ("The compensation committee adopted a routine amendment to long-term incentive plan targets.", "NEUTRAL"),
    ("The board approved the annual grant of equity awards to non-management employees.", "NEUTRAL"),
    ("Filed a document confirming that the annual meeting quorum was met.", "NEUTRAL"),
    ("The company disclosed a minor change in its internal reporting structure.", "NEUTRAL"),
    ("Announced the routine hiring of a new internal audit manager.", "NEUTRAL"),
    ("The company confirmed that no non-public material information was selectively disclosed.", "NEUTRAL"),
    ("Filed an Item 8.01 disclosing routine market positioning information.", "NEUTRAL"),
    ("The board formally approved the annual performance reviews for principal officers.", "NEUTRAL"),
    ("The company announced a standard, expected change in the interest rate of a minor loan.", "NEUTRAL"),
    ("A long-serving officer's employment agreement was routinely extended.", "NEUTRAL"),
    ("The company filed a Form 8-K to disclose the completion of a non-material legal process.", "NEUTRAL"),
    ("The company's external law firm provided a general update on litigation volume.", "NEUTRAL"),
    ("The board adopted a new policy on using generative AI in internal operations.", "NEUTRAL"),
    ("The company successfully completed a routine annual inspection by a regulator.", "NEUTRAL"),
    ("Filed a document confirming a routine change in the par value of common stock.", "NEUTRAL"),
    ("The company disclosed minor updates to its environmental policy documentation.", "NEUTRAL"),
    ("Announced the transfer of intellectual property rights between two wholly-owned subsidiaries.", "NEUTRAL"),
    ("The board confirmed that all directors remain qualified under exchange rules.", "NEUTRAL")
]



MONGO_URI = os.environ.get("MONGO_URI")

# MongoDB Settings
DB_NAME = "HackHarvard"
VECTOR_COLLECTION = "sentiment_vectors" 
VECTOR_INDEX_NAME = "vector_index_sentiment"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
VECTOR_DIMENSIONS = 384

try:
    if SentenceTransformer:
        # Load model from disk/cache - this is the slow step that happens once
        model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print(f"Local embedding model {EMBEDDING_MODEL_NAME} loaded.")
    else:
        model = None
    mongo_client = MongoClient(MONGO_URI)
    db_collection = mongo_client[DB_NAME][VECTOR_COLLECTION]
    print("MongoDB client initialized successfully.")

except Exception as e:
    print(f"Initialization failed: {e}")
    model = None
    mongo_client = None
    db_collection = None

def get_embedding(text: str) -> Optional[List[float]]:
    """Generates a 384-dimensional vector embedding for the input text using SBERT."""
    if not model:
        return None
    try:
        embedding = model.encode(text).tolist()
        return embedding
    except Exception as e:
        print(f"Error generating local embedding: {e}")
        return None

def setup_initial_sentiment_vectors():
    """
    TRAINS THE MODEL by generating vectors for pre-labeled text snippets and 
    inserting them into the MongoDB Atlas collection. This should only be run ONCE.
    """
    if db_collection is None:
        print("Cannot run setup: MongoDB or local model not initialized.")
        return
    
    db_collection.delete_many({})
    print(f"Cleared collection and preparing to insert {len(TRAINING_DATA_500)} training vectors...")
    
    documents_to_insert = []
    for text, impact in TRAINING_DATA_500:
        # Generate embedding using the local model
        embedding = get_embedding(text)
        if embedding:
            documents_to_insert.append({
                "text_snippet": text,
                "impact": impact,
                "plot_embedding": embedding, 
                "timestamp": datetime.utcnow()
            })
            
    if documents_to_insert:
        db_collection.insert_many(documents_to_insert)
        print(f"Successfully inserted {len(documents_to_insert)} labeled vectors.")
    else:
        print("Failed to generate any embeddings for insertion.")

def predict_impact_vector_search(filing_text: str) -> Dict[str, str]:
    """
    Classifies financial impact using near-instant Vector Search.
    FIX: Increased search candidates and adjusted confidence thresholds 
    to prevent uniform 'NEUTRAL, LOW CONFIDENCE' results.
    """
    if db_collection is None:
        return {"impact": "ERROR", "confidence": "None"}

    query_vector = get_embedding(filing_text)
    
    if not query_vector:
        return {"impact": "NEUTRAL", "confidence": "Low"}

    try:
        pipeline = [
            {
                '$vectorSearch': {
                    "queryVector": query_vector,
                    "path": "plot_embedding",
                    "numCandidates": 100,  # INCREASED from 50 to 150 for better search breadth
                    "limit": 10,           # Increased from 5 to 10 for more votes
                    "index": VECTOR_INDEX_NAME,
                }
            },
            {
                '$project': {
                    "impact": 1,
                    "score": {'$meta': 'vectorSearchScore'}, 
                    "_id": 0 
                }
            }
        ]
        
        results = list(db_collection.aggregate(pipeline))
        
        if not results:
             return {"impact": "NEUTRAL", "confidence": "Low"}

        # 3. Aggregate Votes and Determine Confidence
        vote_counts = {"STOCK_UP": 0, "STOCK_DOWN": 0, "NEUTRAL": 0}
        total_score_sum = 0
        
        # Weigh votes by score (cosine similarity score)
        for res in results:
            impact_type = res.get('impact', 'NEUTRAL')
            score = res.get('score', 0)
            
            if impact_type in vote_counts:
                vote_counts[impact_type] += score 
            total_score_sum += score

        # Determine the winner based on weighted votes
        most_voted_impact = max(vote_counts, key=vote_counts.get)
        
        # Confidence is the winning weighted score divided by the total score
        confidence_level = vote_counts[most_voted_impact] / total_score_sum
        
        # ADJUSTED CONFIDENCE THRESHOLDS (A simple majority is now "High" confidence)
        confidence = "High" if confidence_level >= 0.70 else "Moderate" if confidence_level >= 0.4 else "Low"

        return {"impact": most_voted_impact, "confidence": confidence}

    except Exception as e:
        print(f"MongoDB Vector Search error: {e}")
        return {"impact": "ERROR", "confidence": "None"}
    
#setup_initial_sentiment_vectors()