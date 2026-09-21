"""
FreightIQ — Mock Domain Knowledge Documents
Realistic port authority circulars, vessel constraints, chartering patterns,
CVC compliance rules, and BDI/BCI/BPI/BSI index descriptions.

These documents are embedded into the FAISS vector store at startup and
retrieved by the RAG pipeline when answering unstructured questions.

In production: replace with actual ingested PDFs, circulars, and filings
using a LangChain document loader (PyPDFLoader, UnstructuredLoader, etc.).
"""

from __future__ import annotations

from langchain_core.documents import Document


def get_mock_documents() -> list[Document]:
    """
    Returns ~30 curated domain knowledge documents covering:
      - Port authority circulars (draft, LOA, beam constraints per berth)
      - CVC audit trail compliance guidelines
      - Vessel class specifications and constraints
      - BDI / BCI / BPI / BSI index descriptions
      - Historical chartering patterns and seasonal advisories
      - Demurrage and laytime reference
    """
    return [

        # ─────────────────────────────────────────────────────────────────
        # PARADIP PORT — Circulars & Constraints
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Paradip Port Authority — Circular PPT/OPS/2026-04: "
                "Maximum permissible draft at Coal Berth 2 (CB-2) is 14.5 metres. "
                "Maximum LOA is 229 metres. Maximum beam is 32.26 metres. "
                "Vessels exceeding these limits require special tidal window clearance "
                "from the Harbour Master and must engage two tugs. "
                "Night navigation is restricted for vessels with LOA > 200m. "
                "All vessels must maintain Under Keel Clearance (UKC) of minimum 1.0 metre."
            ),
            metadata={
                "source": "Paradip Port Authority Circular PPT/OPS/2026-04",
                "doc_type": "port_circular",
                "port": "Paradip",
                "berth": "Coal Berth 2",
                "date": "2026-04-15",
            },
        ),
        Document(
            page_content=(
                "Paradip Port Authority — Iron Ore Berth (IOB) Constraints: "
                "Maximum draft at Iron Ore Berth is 14.0 metres (channel-limited). "
                "Maximum LOA is 260 metres. Beam limit is 43 metres. "
                "Capesize vessels are permitted with prior port clearance. "
                "Mechanised loading rate is 8,000-10,000 MT per day for iron ore. "
                "Tidal range at Paradip is approximately 1.8 metres (semi-diurnal). "
                "Port does NOT have general tide dependency for most berths."
            ),
            metadata={
                "source": "Paradip Port Authority Operations Manual 2026",
                "doc_type": "port_circular",
                "port": "Paradip",
                "berth": "Iron Ore Berth",
                "date": "2026-01-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # VIZAG PORT — Circulars & Constraints
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Visakhapatnam Port Authority (VPA) — Marine Circular VPA/MC/2026-03: "
                "Inner Harbour: Maximum draft 10.7 metres, LOA 185 metres. "
                "Outer Harbour: Maximum draft 18.1 metres, LOA 330 metres, Beam 55 metres. "
                "The Outer Harbour can accommodate Capesize and VLOC vessels. "
                "Dedicated iron ore handling terminal at Outer Harbour with "
                "loading rate up to 16,000 MT per day. "
                "No tide dependency at outer harbour berths. "
                "Pilotage is compulsory for all vessels > 200 GT."
            ),
            metadata={
                "source": "VPA Marine Circular VPA/MC/2026-03",
                "doc_type": "port_circular",
                "port": "Vizag",
                "berth": "Outer Harbour",
                "date": "2026-03-20",
            },
        ),
        Document(
            page_content=(
                "Vizag Port — Coal Import Terminal (EQ-10 Berth): "
                "Maximum draft 14.5 metres. Maximum LOA 235 metres. "
                "Unloading rate for coal: 12,000-15,000 MT per day using grab cranes. "
                "Average turnaround time for coal vessels: 4-5 days. "
                "Port congestion typically increases during monsoon season "
                "(June-September) due to swell conditions restricting pilotage."
            ),
            metadata={
                "source": "VPA Coal Terminal Operations Report 2025-26",
                "doc_type": "port_circular",
                "port": "Vizag",
                "berth": "EQ-10",
                "date": "2025-12-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # HALDIA PORT — Circulars & Constraints
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Syama Prasad Mookerjee Port (Haldia Dock Complex) — "
                "Navigation Advisory HDC/NAV/2026-02: "
                "Maximum permissible draft at Haldia Oil Jetty: 9.0 metres. "
                "Maximum draft at Haldia Dock Complex berths: 8.5 metres. "
                "LOA limit: 185 metres. Beam limit: 26 metres. "
                "CRITICAL: Haldia is TIDE-DEPENDENT — vessel movements restricted "
                "to tidal windows. Average tidal range: 4.5-5.5 metres. "
                "Vessels must transit the Hooghly River channel (67 NM from Sandheads). "
                "Two-way traffic NOT permitted for vessels > LOA 170m. "
                "Haldia is structurally congested with average berth waiting time of 3-5 days."
            ),
            metadata={
                "source": "HDC Navigation Advisory HDC/NAV/2026-02",
                "doc_type": "port_circular",
                "port": "Haldia",
                "berth": "General",
                "date": "2026-02-10",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # DHAMRA PORT — Circulars & Constraints
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Dhamra Port Company Ltd (DPCL) — Port Specification Circular DPCL/2026-01: "
                "Maximum permissible draft: 18.0 metres (deepest port on East Coast). "
                "Maximum LOA: 330 metres. Maximum Beam: 55 metres. "
                "Can accommodate Cape-size and VLOC vessels up to 200,000 DWT. "
                "Mechanised coal/iron ore handling with conveyor-based loading at "
                "25,000 MT per day capacity. "
                "Two fully mechanised berths operational. Third berth under construction. "
                "No tide dependency for approach channel. "
                "Located in Bhadrak district, Odisha — 65 km from Paradip. "
                "Connected to hinterland via dedicated rail corridor."
            ),
            metadata={
                "source": "DPCL Port Specification Circular DPCL/2026-01",
                "doc_type": "port_circular",
                "port": "Dhamra",
                "berth": "General",
                "date": "2026-01-15",
            },
        ),
        Document(
            page_content=(
                "Dhamra Port — Iron Ore Export Terminal Specifications: "
                "Design vessel: Capesize 180,000 DWT (LOA 292m, Beam 45m, Draft 18.0m). "
                "Ship loader capacity: 10,000 MT/hour (two loaders). "
                "Stockyard capacity: 6 million MT per annum. "
                "Current handling capacity: 25 MTPA (expandable to 100 MTPA). "
                "Average turnaround time: 2.5-3.5 days for Capesize. "
                "Berth waiting time averages < 1 day (low congestion). "
                "Dhamra offers significant cost advantage over Paradip for Capesize "
                "due to deeper draft and faster turnaround."
            ),
            metadata={
                "source": "DPCL Iron Ore Terminal Datasheet 2025",
                "doc_type": "port_circular",
                "port": "Dhamra",
                "berth": "Iron Ore Terminal",
                "date": "2025-06-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # CVC COMPLIANCE & AUDIT TRAIL
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Central Vigilance Commission (CVC) Guidelines for Freight Procurement — "
                "Circular No. 02/01/2026: "
                "All freight chartering decisions for government cargo (coal, fertiliser, "
                "iron ore) MUST maintain a complete audit trail including: "
                "1. Market rate benchmarks (BDI/BCI/BPI) at time of decision. "
                "2. At least 3 competitive quotations from shipbrokers. "
                "3. Justification memo if rate exceeds 5% above Baltic Index benchmark. "
                "4. Port congestion / demurrage risk assessment documented. "
                "5. Vessel vetting report (SIRE/CDI) for tankers. "
                "All records must be preserved for minimum 7 years. "
                "Non-compliance may attract CVC scrutiny under Section 13(1)(d) of PC Act."
            ),
            metadata={
                "source": "CVC Circular No. 02/01/2026",
                "doc_type": "compliance",
                "category": "CVC Guidelines",
                "date": "2026-01-20",
            },
        ),
        Document(
            page_content=(
                "CVC Best Practices for Bulk Cargo Freight Booking: "
                "1. Use transparent e-tender process for freight > INR 5 Crore per voyage. "
                "2. Reference Baltic Exchange indices (BDI, BCI for Capesize, BPI for Panamax, "
                "   BSI for Supramax) as benchmark baselines. "
                "3. Document any deviation from L1 (lowest bidder) with detailed technical "
                "   justification citing vessel suitability, port constraints, and schedule. "
                "4. Maintain digital records of all rate comparison sheets. "
                "5. Seasonal volatility adjustments must cite historical data (3-year rolling avg). "
                "6. Demurrage liability caps should be pre-negotiated in Charter Party terms."
            ),
            metadata={
                "source": "CVC Procurement Best Practices Handbook 2025",
                "doc_type": "compliance",
                "category": "CVC Guidelines",
                "date": "2025-08-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # BDI / BALTIC INDICES
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Baltic Dry Index (BDI) — Overview: "
                "The BDI is a composite index of dry bulk shipping rates issued daily "
                "by the Baltic Exchange in London. It tracks rates across 3 vessel classes: "
                "Capesize (BCI — Baltic Capesize Index, 180K+ DWT), "
                "Panamax (BPI — Baltic Panamax Index, 65-80K DWT), and "
                "Supramax (BSI — Baltic Supramax Index, 45-60K DWT). "
                "BDI is widely regarded as a leading indicator of global economic activity. "
                "A BDI above 2,000 indicates strong demand; below 1,000 signals weak markets. "
                "Historical average (2015-2025): ~1,350 points. "
                "Peak: 11,793 (May 2008). COVID low: 393 (May 2020). "
                "Indian East Coast routes correlate ~0.82 with BCI for iron ore exports."
            ),
            metadata={
                "source": "Baltic Exchange BDI Fact Sheet 2025",
                "doc_type": "index_description",
                "category": "Market Indices",
                "date": "2025-12-01",
            },
        ),
        Document(
            page_content=(
                "Baltic Supramax Index (BSI) — Key Routes for Indian Trade: "
                "BSI S1A: Canakkale via Gibraltar trip — benchmark for Mediterranean trade. "
                "BSI S3: Japan-South Korea round trip — benchmark for Pacific coal. "
                "BSI S10: South China-Australia round — thermal coal indicator. "
                "Indian East Coast Supramax rates typically trade at BSI + 5-12% premium "
                "due to port inefficiency surcharges (congestion/demurrage). "
                "Typical TCE for Supramax on Paradip-Rotterdam: $12,000-$16,000/day. "
                "Seasonality: rates peak Q4 (Oct-Dec) due to pre-winter coal stocking "
                "in Europe and China. Rates trough in Q1 (Jan-Mar) post-Lunar New Year."
            ),
            metadata={
                "source": "BSI Route Analysis — Indian Trade 2025",
                "doc_type": "index_description",
                "category": "Market Indices",
                "date": "2025-11-15",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # VESSEL CLASS SPECIFICATIONS
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Vessel Class Reference — Handysize: "
                "DWT range: 28,000-40,000 MT. Typical LOA: 150-180m. Beam: 23-27m. "
                "Max draft: 10.0-10.5m. Speed: 13-14 knots. Daily fuel: 16-20 MT. "
                "Handysize vessels are the most flexible for Indian minor ports "
                "with shallow draft restrictions. Suitable for Haldia (8.5m draft). "
                "Commonly used for coal imports at smaller ports and fertiliser parcels. "
                "Has own cranes — does not require shore-based handling infrastructure."
            ),
            metadata={
                "source": "FreightIQ Vessel Reference Database",
                "doc_type": "vessel_specs",
                "vessel_class": "Handysize",
                "date": "2026-01-01",
            },
        ),
        Document(
            page_content=(
                "Vessel Class Reference — Supramax: "
                "DWT range: 45,000-60,000 MT. Typical LOA: 180-200m. Beam: 28-32m. "
                "Max draft: 12.2-13.0m. Speed: 14-14.5 knots. Daily fuel: 22-28 MT. "
                "Supramax is the workhorse vessel for Indian East Coast bulk trade. "
                "Fits Paradip (14.5m draft limit), Vizag outer harbour, and Dhamra. "
                "DOES NOT fit Haldia comfortably (8.5m draft — requires part-loading). "
                "Self-geared with 4-5 cranes of 30-35 MT SWL capacity. "
                "Most commonly chartered class for SAIL/NTPC coal imports."
            ),
            metadata={
                "source": "FreightIQ Vessel Reference Database",
                "doc_type": "vessel_specs",
                "vessel_class": "Supramax",
                "date": "2026-01-01",
            },
        ),
        Document(
            page_content=(
                "Vessel Class Reference — Panamax: "
                "DWT range: 65,000-80,000 MT. Typical LOA: 225-230m. Beam: 32.2m. "
                "Max draft: 13.2-14.0m. Speed: 14-15 knots. Daily fuel: 28-32 MT. "
                "Named after Panama Canal lock size (max beam 32.31m). "
                "Suitable for Paradip (marginal fit at 14.5m draft) and Vizag outer harbour. "
                "NOT suitable for Haldia. Marginal at Kandla (12.5m draft). "
                "Gearless — requires shore-based crane/loader infrastructure. "
                "Commonly used for coal and grain cargoes on Indo-Pacific routes."
            ),
            metadata={
                "source": "FreightIQ Vessel Reference Database",
                "doc_type": "vessel_specs",
                "vessel_class": "Panamax",
                "date": "2026-01-01",
            },
        ),
        Document(
            page_content=(
                "Vessel Class Reference — Capesize: "
                "DWT range: 150,000-200,000 MT. Typical LOA: 280-300m. Beam: 43-50m. "
                "Max draft: 17.5-18.5m. Speed: 14.5-15.5 knots. Daily fuel: 45-55 MT. "
                "Named for Cape of Good Hope route (too large for original Panama Canal). "
                "Only suitable for deep-water ports: Vizag outer harbour (18.1m draft), "
                "Dhamra (18.0m draft), and Mundra (17.0m draft). "
                "NOT suitable for Paradip (14.5m), Haldia (8.5m), Kandla (12.5m). "
                "Primarily used for iron ore export and large coal import parcels. "
                "Economy of scale: $/MT cost is 35-45% lower than Supramax for long hauls."
            ),
            metadata={
                "source": "FreightIQ Vessel Reference Database",
                "doc_type": "vessel_specs",
                "vessel_class": "Capesize",
                "date": "2026-01-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # HISTORICAL CHARTERING PATTERNS
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Historical Chartering Pattern Analysis — Paradip to Rotterdam (Iron Ore): "
                "3-year average TCE rate: $13,800/day (Supramax). "
                "Rate range: $9,200 (Q1 2024 trough) to $19,500 (Q4 2024 peak). "
                "Typical voyage duration: 28-32 days (one-way). "
                "Optimal booking window: 3-4 weeks before laycan for best rates. "
                "Forward curve typically shows contango of 3-5% for W+4 during low season "
                "and backwardation of 2-4% during peak Q4 demand. "
                "Mean reversion period: rates tend to revert to 3-month moving average "
                "within 4-6 weeks after sharp moves (>15% deviation)."
            ),
            metadata={
                "source": "FreightIQ Historical Analysis Database",
                "doc_type": "chartering_pattern",
                "route": "Paradip → Rotterdam",
                "cargo": "Iron Ore",
                "date": "2026-06-01",
            },
        ),
        Document(
            page_content=(
                "Historical Chartering Pattern — Haldia to Shanghai (Coal): "
                "3-year average TCE rate: $12,100/day (Supramax, part-loaded due to draft). "
                "Haldia's draft constraint (8.5m) forces Supramax to load only ~35,000 MT "
                "vs full capacity of 52,000 MT — effective cost premium of ~30%. "
                "Alternative: Load at Paradip or Dhamra (full load) for same hinterland cargo. "
                "Monsoon season (Jun-Sep) adds 1-2 days waiting time at Haldia due to "
                "Hooghly River swell and pilotage restrictions. "
                "Average demurrage cost at Haldia: $12,000-$15,000 per day for Supramax."
            ),
            metadata={
                "source": "FreightIQ Historical Analysis Database",
                "doc_type": "chartering_pattern",
                "route": "Haldia → Shanghai",
                "cargo": "Coal",
                "date": "2026-06-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # SEASONAL & MONSOON ADVISORIES
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Indian East Coast — Southwest Monsoon Impact Advisory (June-September): "
                "All East Coast ports experience increased swell, reduced pilotage windows, "
                "and higher berth waiting times during the SW monsoon. "
                "Paradip: Average waiting increase of 1.0-1.5 days. Swell-restricted days: ~15/season. "
                "Vizag: Outer harbour relatively sheltered. Waiting increase: 0.5-1.0 days. "
                "Haldia: Hooghly River conditions deteriorate significantly. "
                "  Waiting increase: 2-3 days. Channel closures possible during cyclonic disturbances. "
                "Dhamra: Exposed to Bay of Bengal swell. Waiting increase: 1-2 days. "
                "Freight rate seasonal premium during monsoon: typically +8-15% above annual average. "
                "Insurance premiums may increase for vessels operating in BOB during cyclone season."
            ),
            metadata={
                "source": "IMD / FreightIQ Seasonal Advisory 2026",
                "doc_type": "advisory",
                "category": "Monsoon",
                "date": "2026-05-15",
            },
        ),
        Document(
            page_content=(
                "Cyclone Season Risk Assessment — Bay of Bengal: "
                "Peak cyclone season: October-December (post-monsoon). "
                "Average 4-5 cyclonic disturbances per season, 1-2 making landfall on East Coast. "
                "Port closure probability during cyclone warning: "
                "  Paradip: 4-6 days per season. Vizag: 2-4 days. Dhamra: 5-7 days. "
                "Demurrage liability during force majeure (cyclone) is typically excluded "
                "under BIMCO standard clauses, but waiting time still incurs bunker costs. "
                "Recommended: Include Indian Ocean Cyclone Warranty clause in CP. "
                "Freight rate cyclone risk premium (Oct-Dec): +3-5% above seasonal baseline."
            ),
            metadata={
                "source": "FreightIQ Risk Assessment Report 2025-26",
                "doc_type": "advisory",
                "category": "Cyclone",
                "date": "2025-10-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # DEMURRAGE & LAYTIME
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Demurrage Rate Reference — Indian East Coast Ports (2025-26): "
                "Handysize: $8,000-$10,000 per day demurrage. "
                "Supramax: $12,000-$15,000 per day demurrage. "
                "Panamax: $14,000-$18,000 per day demurrage. "
                "Capesize: $20,000-$28,000 per day demurrage. "
                "Laytime calculation: Based on BIMCO definitions, "
                "  Sundays and holidays excluded (SHINC) or included (SHEX). "
                "Typical allowed laytime for coal cargo: "
                "  Loading: 20,000-25,000 MT per weather working day (WWD). "
                "  Discharging: 15,000-20,000 MT per WWD. "
                "Despatch rate (early completion bonus): Usually 50% of demurrage rate."
            ),
            metadata={
                "source": "FreightIQ Demurrage Reference Table 2025-26",
                "doc_type": "demurrage",
                "category": "Commercial Terms",
                "date": "2025-07-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # ADDITIONAL PORTS — MUNDRA, CHENNAI, KANDLA
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Mundra Port (Adani Ports) — Port Specifications: "
                "India's largest commercial port by cargo volume. "
                "Maximum draft: 17.0 metres (deepest on West Coast). "
                "Maximum LOA: 350 metres. Can handle VLOC (300K DWT). "
                "9 bulk terminals, 4 container terminals. "
                "Average turnaround: 2.5 days (best in India). "
                "Berth waiting: < 1 day (well-managed private port). "
                "No tide dependency. All-weather port. "
                "Connected via dedicated freight corridor and broad-gauge rail."
            ),
            metadata={
                "source": "Adani Ports Annual Operations Report 2025-26",
                "doc_type": "port_circular",
                "port": "Mundra",
                "berth": "General",
                "date": "2025-12-01",
            },
        ),
        Document(
            page_content=(
                "Kandla Port (Deendayal Port Authority) — Navigation Notice: "
                "Maximum draft: 12.5 metres. Maximum LOA: 225 metres. "
                "TIDE-DEPENDENT: Tidal range 5-7 metres (highest in India). "
                "Vessels > 10m draft require tidal window for entry/exit. "
                "Average berth waiting: 2.5-4 days. "
                "Primary cargoes: POL, fertiliser, salt, grain. "
                "Bulk cargo handling rate: 8,000-12,000 MT per day. "
                "Known for high demurrage risk due to congestion + tidal constraints."
            ),
            metadata={
                "source": "Deendayal Port Authority Notice 2026",
                "doc_type": "port_circular",
                "port": "Kandla",
                "berth": "General",
                "date": "2026-01-01",
            },
        ),
        Document(
            page_content=(
                "Chennai Port — Operational Specifications: "
                "Maximum draft: 15.3 metres (inner harbour: 12.0m). "
                "Maximum LOA: 250 metres. Beam: 40 metres. "
                "24 berths operational. Average turnaround: 3.5 days. "
                "Primary cargoes: automobiles, coal, containers, iron ore. "
                "No tide dependency at outer harbour. "
                "Moderate congestion — average berth wait: 1.5-2.5 days. "
                "Coal imports: primarily thermal coal for TANGEDCO power plants."
            ),
            metadata={
                "source": "Chennai Port Trust Operations Handbook 2025",
                "doc_type": "port_circular",
                "port": "Chennai",
                "berth": "General",
                "date": "2025-11-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # FREIGHT MARKET ANALYSIS
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Freight Rate Volatility Analysis — Indian East Coast Routes (2023-2026): "
                "Supramax volatility (annualised σ): 18-22% for iron ore routes, "
                "  22-28% for coal routes (higher due to China demand swings). "
                "Capesize volatility: 25-35% (highest among dry bulk classes). "
                "Key volatility drivers for Indian routes: "
                "  1. China steel production levels (PMI index correlation: 0.72). "
                "  2. Australian/Indonesian coal export disruptions (weather, regulatory). "
                "  3. Indian port congestion surges (monsoon, festive season). "
                "  4. Global fleet utilisation rate (>90% = tight market, high vol). "
                "  5. FFA (Forward Freight Agreement) speculative positioning. "
                "Regime detection: σ > 25% = high volatility regime → wider P10/P90 bands."
            ),
            metadata={
                "source": "FreightIQ Volatility Research Report Q2 2026",
                "doc_type": "market_analysis",
                "category": "Volatility",
                "date": "2026-06-15",
            },
        ),
        Document(
            page_content=(
                "Freight Procurement — Book Now vs Wait Decision Framework: "
                "A 'Book Now' signal is generated when: "
                "  1. Spot rate is > 5% below 3-month moving average (mean reversion opportunity). "
                "  2. Forward curve is in backwardation (rates expected to fall). "
                "  3. Volatility regime is low (σ < 15%), indicating stable market. "
                "  4. Port congestion is manageable (berth wait < 2 days). "
                "A 'Wait Mode' signal is generated when: "
                "  1. Spot rate is > 8% above historical mean (elevated market). "
                "  2. Strong upward momentum (> +2.5% week-on-week). "
                "  3. Forward curve in contango (rates expected to rise → wait for correction). "
                "  4. High volatility regime (σ > 22%) — spreads wide, risk elevated. "
                "Confidence score: weighted average of factor certainty (55-97% range)."
            ),
            metadata={
                "source": "FreightIQ Decision Engine Documentation v3.2",
                "doc_type": "decision_framework",
                "category": "Market Timing",
                "date": "2026-01-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # NEW MANGALORE & NHAVA SHEVA
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "New Mangalore Port Trust — Port Specifications: "
                "Maximum draft: 14.2 metres. LOA limit: 230 metres. "
                "TIDE-DEPENDENT for vessels > 12.5m draft. "
                "12 berths. Average turnaround: 3-4 days. "
                "Primary cargoes: POL (crude/products), iron ore pellets, coal. "
                "Iron ore export via dedicated conveyor system. "
                "Berth waiting: 2-3 days average. "
                "Located on Karnataka coast — important for hinterland Karnataka/Goa mines."
            ),
            metadata={
                "source": "NMPT Operations Manual 2025-26",
                "doc_type": "port_circular",
                "port": "New Mangalore",
                "berth": "General",
                "date": "2025-09-01",
            },
        ),
        Document(
            page_content=(
                "Jawaharlal Nehru Port Trust (JNPT / Nhava Sheva): "
                "India's premier container port. "
                "Maximum draft: 13.5 metres (approach channel dredged to 14.5m). "
                "LOA: 340 metres (for container vessels). "
                "20 berths including 5 dedicated container terminals. "
                "Average turnaround: 2.5 days (container), 3-4 days (bulk). "
                "No tide dependency. Low congestion for bulk (< 1 day berth wait). "
                "Primarily container-focused — bulk cargo is a secondary line. "
                "Rail connectivity via Dedicated Freight Corridor."
            ),
            metadata={
                "source": "JNPT Annual Report 2025-26",
                "doc_type": "port_circular",
                "port": "Nhava Sheva (JNPT)",
                "berth": "General",
                "date": "2025-10-01",
            },
        ),

        # ─────────────────────────────────────────────────────────────────
        # FUEL & BUNKER COST
        # ─────────────────────────────────────────────────────────────────
        Document(
            page_content=(
                "Bunker Fuel Cost Reference — Indian Ports (2026 Q3): "
                "VLSFO (Very Low Sulphur Fuel Oil, 0.5%S): $550-$600/MT at Indian ports. "
                "MGO (Marine Gas Oil): $800-$850/MT. "
                "Bunker cost as % of total voyage cost: "
                "  Handysize: 25-30%. Supramax: 28-32%. Panamax: 30-35%. Capesize: 35-40%. "
                "Fuel-efficient slow steaming (12 knots vs 14 knots) saves ~18% fuel "
                "but adds 2-3 days transit time on Paradip-Rotterdam route. "
                "IMO 2020 VLSFO mandate continues — scrubber-fitted vessels save $150-$200/MT "
                "by burning HSFO (High Sulphur Fuel Oil) at $400-$450/MT."
            ),
            metadata={
                "source": "FreightIQ Bunker Cost Report Q3 2026",
                "doc_type": "cost_reference",
                "category": "Bunker Fuel",
                "date": "2026-07-01",
            },
        ),
    ]
