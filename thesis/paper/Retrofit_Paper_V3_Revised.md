**Retrofit Depth vs. Roof-Capped PV in Cooling-Dominated Commercial Buildings: A Techno-Economic Crossover Framework**

Eyas Khalid Almughamsi, Marwan Saleh Nasser, Mohamed Arbi Khlifi, Mohsen Aldaadi, Iskender Tlili

*Department of Electrical Engineering, College of Engineering, Islamic University of Madinah, Madinah, Saudi Arabia*

***Abstract***---Commercial buildings in hot--humid coastal climates allocate competing capital between energy-efficiency retrofits and behind-the-meter rooftop photovoltaics (PV); however, two binding constraints frequently absent from existing techno-economic frameworks---a physical roof-derived PV capacity ceiling and a no-export tariff condition---can distort the optimal allocation. This paper develops a coupled, calibrated EnergyPlus--HOMER Pro stage-wise framework to identify the net present cost (NPC)-minimising crossover between cumulative retrofit depth and roof-constrained PV deployment for an 11-floor commercial building in Jeddah, Saudi Arabia. The calibrated baseline (NMBE = +1.90%, CV(RMSE) = 7.51%) satisfies ASHRAE Guideline 14 monthly thresholds and is used to generate hourly demand profiles for five retrofit stages (S0 baseline; S1 LED lighting and controls; S2 operational controls and VFD optimisation; S3 glazing and shading improvements; S4 HVAC efficiency improvement). HOMER Pro re-optimises PV and optional Li-ion battery sizing at each stage subject to a 400 kWp roof cap and a zero sell-back tariff. Three contributions emerge. First, the roof-derived capacity cap is binding across all retrofit depths, indicating that PV sizing is structurally decoupled from retrofit decision-making in multi-storey commercial buildings: maximum feasible PV deployment is always optimal regardless of retrofit stage. Second, the NPC-minimising crossover stage occurs at S3 (cumulative CAPEX USD 917,532), yielding a total 25-year NPC of USD 8.21 M, equivalent to a saving of USD 362,919 (4.2%) relative to the USD 8.57 M baseline. Third, the deeper HVAC plant upgrade (S4, CAPEX USD 2.70 M) is shown to require a grid tariff of USD 0.194/kWh---approximately 128% above the current SEC commercial rate---to attain NPC neutrality, providing a directly applicable tariff-threshold decision criterion. Battery storage is not selected at any stage, with maximum annual PV curtailment of 2.1% being insufficient to justify storage at current capital costs.

***Index Terms***---building energy retrofit; commercial buildings; EnergyPlus; HOMER Pro; net present cost; rooftop photovoltaics; Saudi Arabia; techno-economic optimisation.

**TABLE I.** NOMENCLATURE AND ABBREVIATIONS USED IN THIS PAPER

  -----------------------------------------------------------------------------
  **Abbreviation**   **Definition**
  ------------------ ----------------------------------------------------------
  AHU                Air Handling Unit

  BMS                Building Management System

  CAPEX              Capital Expenditure

  COP                Coefficient of Performance

  CV(RMSE)           Coefficient of Variation of the Root Mean Square Error

  EUI                Energy Use Intensity

  FCU                Fan Coil Unit

  GCR                Ground Coverage Ratio (PV array)

  NMBE               Normalized Mean Bias Error

  NPC                Net Present Cost

  O&M                Operation and Maintenance

  PV                 Photovoltaic

  SAT                Supply Air Temperature

  SEC                Saudi Electricity Company

  SHGC               Solar Heat Gain Coefficient

  UPWF               Uniform Present Worth Factor

  VFD                Variable Frequency Drive

  WWR                Window-to-Wall Ratio
  -----------------------------------------------------------------------------

**I. INTRODUCTION**

Commercial buildings account for a substantial share of electricity consumption in many economies, with space cooling typically dominating end-use demand in hot climates \[1\], \[2\]. Building owners in such regions face a recurring capital-allocation question: should available investment be directed toward energy-efficiency retrofits that reduce demand, or toward behind-the-meter rooftop photovoltaic (PV) systems that offset grid purchases? While this trade-off has been widely investigated under conventional net-metering assumptions, two practical constraints often complicate it in real installations---limited usable roof area and restricted or absent grid export.

In multi-storey commercial buildings, the usable roof footprint is typically much smaller than the total conditioned floor area. Consequently, PV capacity scales with the roof footprint, whereas electricity demand scales with the number of occupied floors. This produces a structural imbalance whereby rooftop PV can offset only a limited fraction of annual electricity demand even when the PV system itself is economically attractive \[3\], \[4\]. Where export compensation is unavailable, PV value is realised mainly through self-consumption and avoided grid purchases \[5\], \[6\]. Under this no-export condition, retrofit measures alter not only annual demand but also the hourly alignment between building load and PV generation, which in turn affects self-consumption and curtailment.

Previous studies have addressed commercial retrofit packages \[7\], \[8\], building automation and control strategies in cooling-dominated climates \[9\]--\[11\], envelope retrofits in Gulf climates \[12\], \[13\], calibrated whole-building simulation \[14\], \[15\], and PV lifecycle economics \[5\], \[16\], \[17\]. The Saudi Building Code SBC 601/602 \[18\] and ASHRAE Standard 90.1 \[19\] further provide prescriptive baselines for envelope and HVAC performance. However, comparatively few studies explicitly couple calibrated stage-wise hourly demand profiles with constrained PV re-sizing under both a hard roof-cap and a no-export rule. This gap is particularly relevant for Saudi commercial buildings, where cooling-dominated demand, low roof-to-floor-area ratios, and behind-the-meter PV constraints can substantially affect the economic ranking of retrofit options \[20\], \[21\].

This paper addresses the gap through an EnergyPlus--HOMER Pro framework applied to a multi-storey commercial building in Jeddah, Saudi Arabia. The specific contributions are: (i) a reproducible coupled framework that links calibrated hourly demand profiles with constrained PV--battery optimisation across cumulative retrofit stages; (ii) evidence that the roof-derived 400 kWp PV capacity cap remains binding across all retrofit depths, decoupling PV sizing from retrofit depth; (iii) identification of Stage 3 as the NPC-minimising retrofit crossover stage, with cumulative CAPEX of USD 917,532 and total 25-year NPC savings of USD 362,919 (4.2% relative to baseline); and (iv) an analytical break-even tariff expression demonstrating that major HVAC plant replacement requires a grid tariff of approximately USD 0.194/kWh---about 128% above the current commercial tariff---to reach NPC neutrality.

**II. METHODOLOGY**

***A. Framework Overview and Crossover Criterion***

Fig. 1 illustrates the six-step workflow used to identify the NPC-minimising retrofit crossover stage. Hourly building electricity demand profiles for five scenarios---the baseline case S0 and four cumulative retrofit stages S1--S4---are produced using a calibrated EnergyPlus model. The resulting profiles are imported into HOMER Pro, which evaluates the cost-minimising PV--grid--storage configuration for each stage subject to the same roof-derived PV upper bound. The total 25-year lifecycle NPC is then obtained by combining the HOMER-optimised energy-system NPC with the cumulative present value of retrofit package costs.

Retrofit costs are not embedded in the HOMER system NPC; they are added externally to obtain the total lifecycle NPC, as detailed in Section II-G. The total NPC at each stage is defined as in (1):

NPC*~total~*(*S~i~*) = NPC*~HOMER~*(*S~i~*) + NPC*~retrofit~*(*S~i~*) (1)

where NPC~HOMER~(*S*~i~) is the 25-year HOMER system NPC for stage *i*, and NPC~retrofit~(*S*~i~) is the cumulative present value of all retrofit package capital, O&M, and replacement costs applied up to and including stage *i*, discounted at a real rate *r* = 6% over a 25-year project lifetime.

The NPC-minimising crossover stage S\* is then defined as in (2):

*S^\*^* = arg min *S~i~* ∈ {S*~0~*, S*~1~*, S*~2~*, S*~3~*, S*~4~*} NPC*~total~*(S*~i~*) (2)

The no-export condition is enforced by setting the grid sell-back tariff to USD 0.00/kWh; surplus PV electricity is therefore treated as non-compensated curtailable energy in the NPC calculation, with no export revenue contributed in any scenario. Stage-to-stage incremental NPC, used to identify the crossover boundary, is defined in (3):

ΔNPC*~i~* = NPC*~total~*(S*~i~*) -- NPC*~total~*(S*~i--1~*) (3)

The crossover stage is taken as the stage with the minimum total NPC. For an ordered cumulative retrofit pathway, the crossover boundary is additionally signalled by the first positive ΔNPC following a sequence of negative increments. Results for all five stages are decomposed into HOMER and retrofit components in Table IX, where S\* is identified.

**Fig. 1.** Methodology workflow: calibrated EnergyPlus demand profiles are passed to HOMER Pro for constrained PV--battery re-optimisation at each retrofit stage. The framework outputs the NPC-minimising crossover stage S\* and the analytical break-even tariff τ\*. \[Figure to be inserted from the original manuscript.\]

***B. Definition of Retrofit Stages***

To support clear interpretation of the crossover analysis, the five retrofit scenarios are summarised in Table II. The baseline scenario S0 represents the as-operated commercial building before any energy-efficiency intervention and serves as the reference case against which all subsequent stages are compared. Stages S1--S4 are then defined cumulatively: each stage applies the previous stage\'s measures plus one additional retrofit package, so that S4 contains the full set of measures. This cumulative structure prevents double-counting of savings and makes the marginal contribution of each package directly observable in the simulation results.

**TABLE II.** DEFINITION OF RETROFIT STAGES

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Stage**   **Designation**                             **Cumulative Scope**
  ----------- ------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------
  S0          Baseline Scenario                           As-operated building used as the reference case for all comparisons (no retrofit applied).

  S1          LED Lighting and Controls                   S0 + lighting power density rationalisation, occupancy sensors, and lighting-schedule optimisation.

  S2          Operational Controls and VFD Optimisation   S1 + AHU fractional availability scheduling, supply-air-temperature reset, and air-side variable-frequency drive (VFD) optimisation.

  S3          Glazing and Shading Improvements            S2 + solar-control window film and external fixed shading on the glazed façade.

  S4          HVAC Efficiency Improvement                 S3 + chiller COP upgrade, condenser-fan power reduction, chilled-water-pump VFDs, and AHU-fan efficiency improvement.
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

*Each stage is cumulative: stage Si contains the measures of stage Si--1 plus one additional retrofit package, so that S4 represents the deepest retrofit. The corresponding package economics and modelled parameter changes are summarised in Section II-D and Table III.*

***C. Demand Modelling and Calibration***

A whole-building electricity demand model was developed in DesignBuilder, which acts as the graphical modelling interface to the EnergyPlus simulation engine \[22\]. EnergyPlus is responsible for solving the building thermal balance and computing HVAC, lighting, equipment, and total electricity demand. The simulation boundary was aligned with the whole-building electricity billing boundary used by the Saudi Electricity Company (SEC) so that measured and simulated electricity consumption are directly comparable.

The baseline demand model was calibrated against twelve consecutive months of whole-building monthly electricity totals. Calibration acceptability was evaluated using the normalized mean bias error (NMBE) and the coefficient of variation of the root mean square error, CV(RMSE), as defined in (4) and (5), following the monthly calibration criteria of ASHRAE Guideline 14 \[23\]:

NMBE = \[1/(n − p)\] × Σ (M*~i~* − S*~i~*) / M̄ × 100% (4)

CV(RMSE) = (1/M̄) × {\[1/(n − p)\] × Σ (M*~i~* − S*~i~*)*^2^*}*^1/2^* × 100% (5)

where *M*~i~ is the measured monthly consumption, *S*~i~ is the simulated monthly consumption, *M̄* is the mean of the measured values, *n* is the number of monthly intervals (12), and *p* is the number of model parameters adjusted during calibration. The accept-criteria adopted are \|NMBE\| ≤ 5% and CV(RMSE) ≤ 15%, in accordance with the monthly thresholds of ASHRAE Guideline 14 \[23\].

Because calibration is based on monthly utility totals, the resulting 8,760-hour outputs are interpreted as simulation-derived representative demand profiles rather than directly validated measured hourly data. EnergyPlus simulations used a representative Jeddah weather file derived from NASA POWER data \[24\]; the same calibrated model, weather file, occupancy schedules, and operating assumptions were applied across all stages so that differences in stage-wise demand profiles reflect only the modelled retrofit-package parameter changes.

The calibrated baseline model was then used to generate representative-year hourly demand profiles for S0 and the four cumulative retrofit stages S1--S4. The hourly profiles were exported for subsequent techno-economic evaluation in HOMER Pro. HOMER solar-resource inputs were drawn from the same NASA POWER dataset, with an annual average global horizontal irradiance of 5.94 kWh/m²·day and mean air temperature of 29.2 °C.

***D. Cumulative Retrofit Packages***

Four retrofit packages are applied cumulatively in a fixed order, with explicit precedence rules to prevent double-counting: each package modifies only parameters within its defined domain, while parameters introduced by upstream packages are held fixed in subsequent stages. Cost assumptions are based on engineering estimates appropriate for local market conditions and expressed in real USD. Table III summarises the package economics; the modelled parameter changes are described below.

**Package A (S0 → S1) --- LED lighting rationalisation and controls.** The normalised lighting power density is reduced from 0.85 to 0.60 W/m² per 100 lux, and peak occupancy lighting-schedule fractions are reduced by approximately 19%, consistent with the energy-conservation provisions of SBC 601/602 \[18\] and ASHRAE 90.1 \[19\].

**Package B (S1 → S2) --- Operational controls and air-side VFD optimisation.** The AHU availability schedule is restructured from binary on/off operation to fractional part-load operation matched to occupancy. Cooling setpoint scheduling and supply air temperature (SAT) reset are also optimised, while selected air-side fans are converted to VFD operation. This package alters not only annual demand but also the simulated hourly load distribution during occupied and cooling-dominated hours.

**Package C (S2 → S3) --- Glazing and shading improvements.** Solar-control window film and external fixed shading are applied to the existing glazing system to reduce effective façade-level solar gains. The reference glazing has SHGC/solar transmittance = 0.33, visible transmittance = 0.58, and U-value = 2.53 W/m²·K.

**Package D (S3 → S4) --- HVAC efficiency improvement.** Chiller coefficient of performance (COP) is upgraded from 2.8 to 3.5; the condenser-fan power ratio is reduced from 0.035 to 0.028; the chilled-water pump is converted to variable-speed-drive operation with a motor efficiency of 0.93; and the AHU-fan efficiency is improved to 0.72. The negative O&M value reported for Package D in Table III represents net maintenance savings relative to baseline chiller operating costs, not a revenue stream.

**TABLE III.** RETROFIT PACKAGE ECONOMICS (25-YEAR HORIZON, 6% REAL DISCOUNT RATE)

  ---------------------------------------------------------------------------------------------------------------------------
  **Pkg**   **Description**     **CAPEX (USD)**   **O&M (USD/yr)**   **PV of O&M & Replac. (USD)**   **Total Pkg PV (USD)**
  --------- ------------------- ----------------- ------------------ ------------------------------- ------------------------
  A         LED + controls      65,000            2,000              34,269                          99,269

  B         Controls + VFD      350,000           8,000              135,745                         485,745

  C         Glazing + shading   320,000           0                  12,518                          332,518

  D         HVAC upgrade        2,700,000         −15,000            −191,750                        2,508,250
  ---------------------------------------------------------------------------------------------------------------------------

*Note: A negative O&M value denotes net maintenance savings relative to baseline chiller O&M, not a positive revenue stream.*

***E. Roof-Derived PV Capacity Cap***

The maximum PV capacity is determined from the available roof area rather than treated as an unconstrained optimisation variable. The gross roof footprint is 4,500 m², of which 40% is excluded for rooftop mechanical equipment, water tanks, safety-access pathways, and constructability setbacks. The exclusion is composed of approximately 25% for rooftop plant and equipment and 15% for access and setback requirements, in line with rooftop feasibility practice \[4\]. The usable roof area is computed by (6):

*A~usable~* = *A~gross~* × (1 − *f~exclusion~*) (6)

yielding *A*~usable~ = 4,500 × 0.60 = 2,700 m². The roof-derived PV capacity cap is then computed via (7):

*P~PV,cap~* = *A~usable~* × GCR × η*~module~* × G*~STC~* (7)

where GCR = 0.65 is the ground coverage ratio for fixed-tilt rows at Jeddah latitude (tilt 22.7°), η~module~ = 22.5% is the rated STC module efficiency, and G~STC~ = 1 kW/m² is the STC reference irradiance. Substituting the values yields P~PV,cap~ = 2,700 × 0.65 × 0.225 = 394.9 ≈ 400 kWp. The PV array is modelled as fixed-tilt and south-facing, using the HOMER azimuth convention. The 400 kWp roof cap is held constant across all five stages so that NPC differences between stages reflect retrofit-induced demand-profile changes rather than PV deployment changes.

***F. HOMER Pro Optimisation Setup***

For each retrofit stage, HOMER Pro \[25\] was used to identify the minimum-NPC PV--grid--storage configuration under the same roof-derived PV capacity cap. PV capacity was searched from 0 to 400 kWp, with a derating factor of 86% and a fixed tilt of 22.7°. Battery storage was included as an optional component using a generic Li-ion model, with candidate capacities ranging from 0 to 1,000 kWh; therefore, zero battery capacity was an admissible and reportable optimisation outcome. The converter efficiency was set to 97%, the maximum allowable annual capacity shortage was constrained to 0%, and the Cycle Charging dispatch strategy was applied consistently across all stages.

A zero sell-back tariff (USD 0.00/kWh) represents the no-export condition. Surplus PV generation therefore receives no economic credit in the NPC calculation. Grid purchases are priced at an energy-only commercial tariff of USD 0.085/kWh, equivalent to the Saudi commercial rate of 0.32 SAR/kWh at an exchange rate of 3.75 SAR/USD \[26\]. Fixed charges, demand charges, and taxes are not separately modelled.

Component assumptions are kept constant across stages to ensure comparability. PV capital and replacement costs are USD 800/kWp and USD 700/kWp, respectively, with O&M of USD 15/kWp·yr and a 25-year service life. Converter capital and replacement costs are USD 150/kW each, with zero annual O&M and a 15-year life. The Li-ion battery capital cost is USD 300/kWh, replacement cost USD 240/kWh, O&M USD 5/kWh·yr, and lifetime 15 years or 6,000 kWh throughput, consistent with the recent NREL Annual Technology Baseline \[27\]. The project lifetime is 25 years, the nominal discount rate is 6%, and inflation is set to 0%, so all results are expressed on a real-discount-rate basis. Retrofit package costs are excluded from the HOMER system NPC and added externally as described in Section II-G.

***G. Total Lifecycle NPC Computation***

The total lifecycle NPC at each retrofit stage is the sum of the HOMER-optimised system NPC and the cumulative present value of all retrofit packages applied at or before that stage, as already defined in (1). The retrofit-package present value at package j is given in (8):

NPC*~pkg~*(j) = CAPEX*~j~* + PV(O&M*~j~*) + PV(Replacements*~j~*) (8)

Annual O&M costs are converted to present value using the uniform present worth factor UPWF = 1/CRF = 12.79, where CRF = 0.0782 corresponds to a real discount rate of 6% and a 25-year project lifetime. Replacement costs are discounted to the base year using (1 + r)\^−k, where k is the replacement year. All costs are expressed in real USD. Retrofit package salvage values are assumed negligible, while HOMER handles energy-system residual values internally through its built-in salvage calculation.

The analytical break-even tariff for Package D is defined as the tariff at which the present value of the annual grid-energy savings equals the net present cost of Package D, as expressed in (9):

*τ^\*^* = NPC*~pkg~*(D) / \[ΔE*~grid,D~* × UPWF\] (9)

where ΔE~grid,D~ = E~grid~(S~3~) − E~grid~(S~4~) is the annual grid-consumption reduction achieved by Package D. Equation (9) is evaluated in Section V-D to determine the tariff level at which the HVAC efficiency package becomes NPC-neutral.

***H. Retrofit Cost Estimation Basis***

The retrofit cost assumptions were developed using a range-based engineering estimation procedure rather than adopting fixed values from a single source. For each package, a practical cost range was first established for the relevant equipment, sensors, controls, installation, commissioning, and contingency items. A representative value within each range was then selected based on the actual retrofit boundary and the case-study building scale. The simulated measures represent partial retrofits---control reprogramming, selected air-side VFD optimisation, window film with external fixed shading, and partial HVAC plant upgrade---rather than complete system replacement; the resulting CAPEX values are therefore consistent with the techno-economic model used in the NPC analysis. The supporting literature ranges are summarised in Table IV; representative item-level breakdowns and corrected package totals are given in Table V; and the cumulative present-value consistency with the NPC results is confirmed in Table VI.

**TABLE IV.** LITERATURE AND TECHNICAL REFERENCES SUPPORTING PACKAGE COST RANGES

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Package**                 **Retrofit Scope**                                                                                                       **Literature Range Basis**                                                                                                                                              **Reference**
  --------------------------- ------------------------------------------------------------------------------------------------------------------------ ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- ----------------
  A --- LED + Controls        Occupancy sensors, lighting relays, low-voltage wiring, programming, testing.                                            Lighting-control retrofits in commercial buildings typically add USD 0.50--1.00/ft² to project capital cost, depending on system extent and integration with the BMS.   \[28\]

  B --- HVAC Controls + VFD   AHU/FCU reprogramming, sensor verification, SAT reset, selected air-side VFDs, BMS graphics, commissioning.              Sensor and controls retrofits with commissioning fall in the USD 0.98--1.34/ft² range, covering labour, programming, balancing, and testing.                            \[29\]

  B --- Commissioning         Existing-building commissioning (re-commissioning) component.                                                            Median existing-building commissioning costs reported around USD 0.26/ft² across a wide commercial sample.                                                              \[30\]

  C --- Glazing + Shading     Solar-control window film, external fixed shading, installation, façade access, QA.                                      Installed solar-control films around USD 7.75/ft² (premium); external shading adds fixed fin/bracket cost USD 45--70/linear m.                                          \[31\]

  D --- HVAC Upgrade          Chiller modernisation, pump/fan VFDs, premium motors, plant sensors, BMS integration, electrical works, commissioning.   Item-level cost ranges for high-efficiency chillers, pump VFDs, sensors, and motors are documented in DOE/EPA technical guidance.                                       \[32\], \[33\]
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**TABLE V.** ITEM-LEVEL COST ESTIMATION SUMMARY BY RETROFIT PACKAGE

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Package**                 **Representative Cost Items**                                                                                                                                                                                                     **Quantity Basis**                                   **Unit Range (USD)**                                                                   **Package Total (USD)**
  --------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------------------------- -------------------------------------------------------------------------------------- -------------------------
  A --- LED + Controls        Occupancy sensors (240 units); lighting relays (72 points); LED rationalisation (400 fixtures); floor modules (12 floors); installation; programming; testing.                                                                    240 sensors + 72 relays + 400 fixtures + 12 floors   USD 60--100/sensor; USD 70--110/relay; USD 25--45/fixture                              65,000

  B --- HVAC Controls + VFD   AHU/FCU reprogramming (500); sensor verification incl. SAT (120); static-pressure + air-side VFDs (40 AHUs); BMS graphics; SAT reset; chiller/pump supervision; commissioning (12 floors); contingency.                           500 AHU/FCU + 40 VFD units + 12 floors               USD 90--150/AHU; USD 1,800--2,600/VFD unit; USD 3,000--4,500/floor (commissioning)     350,000

  C --- Glazing + Shading     Solar-control film (4,600 m²); surface preparation; installation labour; fixed external shading (1,200 lm); brackets/accessories; façade access (12 floors); mock-up/QA; contingency.                                             4,600 m² film + 1,200 linear m shading               USD 18--26/m² (film); USD 45--70/linear m (shading); USD 1,300--2,000/floor (access)   320,000

  D --- HVAC Upgrade          Selected chiller modernisation (900 TR); compressor/VFD kits (6); pump VFDs (40); AHU-fan VFDs (60); premium motors (80); plant sensors/meters (50); BMS integration; panels/cabling; installation; commissioning; contingency.   900 TR + 40 pumps + 60 AHU fans + 50 sensor points   USD 800--1,200/TR; USD 4,500--9,000/pump; USD 2,500--4,000/AHU fan                     2,700,000
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

*Note: All costs are in real USD. Package B CAPEX of USD 350,000 represents operational controls plus selected air-side VFD optimisation only (not full BMS replacement). Package C CAPEX of USD 320,000 includes both window film and external fixed shading. Packages A and D are unchanged.*

**TABLE VI.** CUMULATIVE RETROFIT COST CONSISTENCY CHECK

  ------------------------------------------------------------------------------------------------------------------------
  **Stage**   **Packages Applied**   **Package PV Added (USD)**   **Cumulative Retrofit PV (USD)**   **Formula**
  ----------- ---------------------- ---------------------------- ---------------------------------- ---------------------
  S0          Baseline               ---                          ---                                No retrofit cost

  S1          A                      99,269                       99,269                             A

  S2          A + B                  485,745                      585,014                            99,269 + 485,745

  S3 ★        A + B + C              332,518                      917,532                            585,014 + 332,518

  S4          A + B + C + D          2,508,250                    3,425,782                          917,532 + 2,508,250
  ------------------------------------------------------------------------------------------------------------------------

*★ S3 is the NPC-minimising crossover stage (S\*). Cumulative retrofit PV at S3 = USD 917,532 and at S4 = USD 3,425,782, consistent with Table IX of this paper.*

**III. CASE STUDY APPLICATION**

***A. Building and Tariff Context***

The case-study building is the Bin Homran Commercial Center, an 11-floor office-dominant commercial high-rise in Jeddah, Saudi Arabia (21.75°N, 39.25°E). Jeddah experiences a hot--humid coastal climate with an annual mean dry-bulb temperature of 29.2 °C and global horizontal irradiance of 5.94 kWh/m²·day. The conditioned gross floor area is approximately 54,000 m², served by a centralised chilled-water HVAC system comprising approximately 500 terminal units (AHUs and FCUs) and 25 modular chillers with combined installed cooling capacity of about 2,700 TR. The envelope features a continuous horizontal double-glazed curtain wall (U = 2.60 W/m²·K, SHGC = 0.30, WWR = 87%), and the baseline chiller plant operates at a reference COP of 2.80 with a leaving chilled-water temperature of approximately 5.6 °C. The occupied cooling setpoint is 24 °C, with a setback of 28 °C during unoccupied periods. Energy cost analysis applies the SEC commercial flat tariff of USD 0.085/kWh under a no-export condition \[26\].

***B. Calibration Results***

The baseline energy model (S0) was developed in DesignBuilder/EnergyPlus using documented building geometry, HVAC configuration, and occupancy schedules derived from facility records, then calibrated against twelve consecutive months of SEC billing data. Calibration acceptability was assessed against the ASHRAE Guideline 14 monthly thresholds (\|NMBE\| ≤ 5% and CV(RMSE) ≤ 15%) \[23\]; both criteria were satisfied (NMBE = +1.90%, CV(RMSE) = 7.51%), confirming the suitability of the baseline as a reference for stage-wise comparison. The calibrated baseline produced representative-year 8,760-hour hourly demand profiles for stages S0--S4, which were subsequently exported to HOMER Pro for PV--grid optimisation under each retrofit scenario.

***C. Demand Reduction by Stage***

Table VII summarises the whole-building annual electricity consumption, EUI, and peak demand for each retrofit stage. The baseline (S0) provides a reference consumption of 8,141,075 kWh/yr (EUI = 150.8 kWh/m²·yr) and peak demand of 3,940 kW. Marginal reductions range from a modest −1.4% at S1 (lighting controls) to a cumulative −27.0% at S4 (full equipment upgrade), with peak demand declining progressively from 3,940 kW at S0 to 3,082 kW at S4. As discussed in Section IV, however, the high capital intensity of Package D causes S4 to be economically suboptimal relative to S3 once retrofit costs are considered. The hourly profiles for each stage are exported directly to HOMER Pro for techno-economic re-optimisation.

**TABLE VII.** ANNUAL ELECTRICITY CONSUMPTION AND PEAK DEMAND BY STAGE

  ----------------------------------------------------------------------------------------------------------------------------------
  **Stage**   **Packages Applied**   **Annual Consumption (kWh/yr)**   **EUI (kWh/m²·yr)**   **vs. S0 (%)**   **Peak Demand (kW)**
  ----------- ---------------------- --------------------------------- --------------------- ---------------- ----------------------
  S0          Baseline               8,141,075                         150.8                 ---              3,940

  S1          A --- LED              8,031,066                         148.7                 −1.4%            3,918

  S2          A+B --- Controls       7,352,805                         136.2                 −9.7%            3,897

  S3          A+B+C --- Glazing      6,951,987                         128.7                 −14.6%           3,862

  S4          A+B+C+D --- HVAC       5,940,050                         110.0                 −27.0%           3,082
  ----------------------------------------------------------------------------------------------------------------------------------

**IV. RESULTS**

***A. HOMER Optimisation Results***

Table VIII presents the HOMER Pro optimisation results for all five stages. The roof-derived 400 kWp cap is binding at every stage: the optimiser selects exactly 400 kW of PV regardless of retrofit depth or annual demand level, confirming the structural decoupling of PV sizing from retrofit depth in high floor-to-roof-area buildings. Battery storage is not selected at any stage (0 kWh optimal throughout), a result examined analytically in Section V-E. Annual PV output remains constant at 732,958 kWh/yr across stages, while the PV share of total generation grows from 8.98% at S0 to 12.3% at S4 as building demand falls. HOMER system NPC declines monotonically from USD 8,569,230 at S0 to USD 6,184,868 at S4, reflecting reduced grid purchases at each successive retrofit stage. CO₂ emissions follow the same trend, falling from 4,697,728 kg/yr at S0 to 3,306,679 kg/yr at S4.

**TABLE VIII.** HOMER PRO OPTIMISATION RESULTS BY STAGE

  ------------------------------------------------------------------------------------------------------------------------
  **Stage**   **PV (kW)**   **Battery (kWh)**   **Grid (kWh/yr)**   **PV Share**   **HOMER NPC (USD)**   **CO₂ (kg/yr)**
  ----------- ------------- ------------------- ------------------- -------------- --------------------- -----------------
  S0          400           0                   7,433,492           8.98%          8,569,230             4,697,728

  S1          400           0                   7,323,669           9.10%          8,449,436             4,628,202

  S2          400           0                   6,660,200           9.91%          7,725,722             4,199,540

  S3          400           0                   6,259,631           10.5%          7,288,779             3,946,224

  S4          400           0                   5,247,615           12.3%          6,184,868             3,306,679
  ------------------------------------------------------------------------------------------------------------------------

*Battery capacity = 0 kWh in every stage; the roof cap is binding at 400 kW in every stage.*

***B. Total Lifecycle NPC Analysis and Crossover Identification***

Table IX combines the HOMER system NPC with the cumulative present value of retrofit package costs to determine the total lifecycle NPC at each stage. The NPC-minimising crossover is clearly identified at S3, with a total NPC of USD 8,206,311---a saving of USD 362,919 (4.2%) relative to the USD 8,569,230 baseline. This identifies S3 as the economically optimal retrofit stopping point under the modelled tariff, cost, and roof-availability assumptions.

**TABLE IX.** TOTAL LIFECYCLE NPC AND CROSSOVER IDENTIFICATION

  ----------------------------------------------------------------------------------------------------------------------------
  **Stage**   **HOMER NPC (USD)**   **Retrofit PV Cost (USD)**   **Total NPC (USD)**   **ΔNPC vs. S0 (USD)**   **Decision**
  ----------- --------------------- ---------------------------- --------------------- ----------------------- ---------------
  S0          8,569,230             ---                          8,569,230             ---                     Reference

  S1          8,449,436             99,269                       8,548,705             −20,525                 Marginal

  S2          7,725,722             585,014                      8,310,736             −258,494                Viable

  S3 ★        7,288,779             917,532                      8,206,311             −362,919                S\* (min NPC)

  S4          6,184,868             3,425,782                    9,610,650             +1,041,420              Unviable
  ----------------------------------------------------------------------------------------------------------------------------

The stage-to-stage incremental NPC values (ΔNPCi) are negative through S3, indicating that each of the first three retrofit packages produces a net economic benefit when its full lifecycle cost is included: ΔNPC1 = −USD 20,525 (S0→S1), ΔNPC2 = −USD 237,969 (S1→S2), and ΔNPC3 = −USD 104,425 (S2→S3). The sign of ΔNPC reverses sharply at S3→S4: ΔNPC4 = +USD 1,404,339, marking the crossover boundary. This reversal is driven by the USD 2,508,250 present-value cost of Package D substantially exceeding the corresponding HOMER NPC reduction of USD 1,103,911. The total NPC at S4 reaches USD 9,610,650, which is USD 1,041,420 worse than the unretrofitted baseline. Fig. 2 illustrates the divergence between the monotonically declining HOMER system NPC and the rising cumulative retrofit cost beyond S3.

**Fig. 2.** Total 25-year lifecycle NPC versus retrofit stage. HOMER system NPC and cumulative retrofit costs are shown separately; the total NPC follows their sum. S3 is the NPC-minimising crossover stage (S\*). The S3→S4 reversal of +USD 1.40 M defines the crossover boundary. \[Figure to be inserted from the original manuscript.\]

***C. Bounded Robustness Assessment***

A bounded robustness assessment was conducted to verify that the NPC-minimising crossover remains stable under selected parameter perturbations. First, PV CAPEX was varied by ±20%, with the roof cap, tariff, no-export rule, and retrofit costs held constant. The crossover conclusion was unchanged: S3 retained the minimum total NPC under the −20%, base, and +20% PV CAPEX cases, with total NPC values of USD 8.14 M, USD 8.21 M, and USD 8.27 M, respectively. HOMER continued to select the full 400 kWp PV capacity in every scenario, confirming that the roof-derived PV cap remains binding across the tested PV-cost range.

Second, Stage 4 was tested against break-even conditions. Relative to S3, S4 requires an effective grid tariff of USD 0.194/kWh (≈ 0.727 SAR/kWh) to become NPC-neutral, or, alternatively, a reduction of approximately USD 1.40 M in the present value of Package D---corresponding to an HVAC CAPEX reduction from USD 2.70 M to about USD 1.30 M if only the initial capital cost changes.

Third, the battery threshold at S3 was examined through battery cost-reduction cases. Storage was not selected at 25%, 50%, 75%, or 85% battery cost reductions. Only at a 90% reduction did HOMER select storage, and the selected capacity was only 14 kWh with negligible NPC improvement. The robustness results therefore reinforce the main conclusions: S3 remains the economically preferred stopping point, S4 is not justified under current tariff and cost assumptions, and battery storage has no practical economic role in the present flat-tariff, no-export, roof-capped configuration.

**V. DISCUSSION**

***A. Binding Roof Cap: A Structural Finding for Multi-Storey Buildings***

A central structural finding of this study is that the PV optimiser reaches the roof-derived capacity ceiling of 400 kWp at every retrofit stage. For the studied building, the optimal rooftop PV size is therefore constrained by physical roof availability rather than by the demand reductions achieved through deeper retrofits. The underlying reason is geometric: the conditioned gross floor area (≈ 54,000 m²) is roughly 12 times the gross roof footprint (4,500 m²) and roughly 20 times the usable PV area (2,700 m²). As a consequence, even at maximum feasible deployment, annual PV generation (732,958 kWh/yr) supplies only about 9--12% of the building\'s annual electricity demand across the evaluated stages.

This result is transferable in spirit but should be interpreted as a case-based structural insight rather than a universal threshold. In multi-storey commercial buildings with high floor-area-to-roof-area ratios, rooftop PV capacity may remain physically binding across retrofit depths, making the optimal PV size relatively insensitive to staged demand reduction. Under the tariff, cost, and roof-availability assumptions adopted here, maximum feasible rooftop PV was economically selected at every stage, and rooftop deployment need not be deferred until deeper retrofit is completed. While PV capacity itself is fixed at the roof limit, the overall lifecycle economics remain coupled to retrofit depth through changes in annual grid consumption and total NPC. A broader parametric study across building forms, tariffs, and PV costs would be required before generalising any universal floor-area-to-roof-area threshold.

***B. Why Package B Dominates: Load Shape, Not Just Magnitude***

Package B yields the largest single-stage NPC reduction (ΔNPC = −USD 237,969) at a relatively modest CAPEX of USD 350,000. The mechanism extends beyond annual energy savings: operational controls and AHU fractional availability scheduling reshape the hourly load profile by trimming HVAC demand during low-occupancy periods and reducing part-load penalties. This improves the temporal alignment between midday PV generation and building demand, increasing the self-consumption fraction and reducing curtailment. The practical implication for cooling-dominated commercial buildings is clear: scheduling and setpoint optimisation should be the first investment, prior to any capital-intensive hardware replacement.

***C. Energy-Optimal versus Economically Optimal Retrofit Depth***

A central lesson of the analysis is the distinction between energy performance and economic performance. In purely energy-saving terms, S4 is the deepest and best-performing stage: it reduces annual electricity consumption by 27.0% relative to S0 and avoids the most CO₂. In economic terms, however, S3 is the optimal stopping point: it minimises the 25-year total lifecycle NPC at USD 8.21 M, while the move from S3 to S4 worsens total NPC by approximately USD 1.40 M. This contrast is fundamental to the framework presented here: the NPC-minimising crossover stage S\* identifies the point at which the marginal HOMER NPC reduction from the next package is no longer sufficient to offset that package\'s lifecycle present-value cost. Deeper retrofits beyond S\* improve energy and emissions performance but at a net economic penalty under the current tariff and cost assumptions. This separation of energy-optimal and economically optimal solutions is precisely what the proposed framework is designed to make explicit.

***D. Break-Even Tariff for Package D: An Analytical Decision Criterion***

The incremental NPC-neutrality condition for Package D, evaluated relative to S3, can be expressed by setting the present value of its annual grid-energy savings equal to its net present retrofit cost. Using (9), and noting that the annual grid-consumption reduction from S3 to S4 is ΔEgrid = 6,259,631 − 5,247,615 = 1,012,016 kWh/yr, with CRF(6%, 25) = 0.0782 and an annuity factor UPWF = 12.79, and substituting NPCD,net = USD 2,508,250:

*τ^\*^* = 2,508,250 / (1,012,016 × 12.79) = USD 0.194/kWh (10)

The current commercial electricity tariff is USD 0.085/kWh; therefore Package D requires an effective electricity price approximately 128% above the current tariff to become NPC-neutral. This explains why S4 reduces annual demand but does not improve total lifecycle economics. Under current cost and tariff assumptions, the HVAC plant upgrade is not economically justified for this case. The threshold of USD 0.194/kWh provides a practical reassessment trigger: Package D may become viable if future electricity tariffs rise substantially, HVAC upgrade costs decline, or additional value streams---demand-charge reduction, carbon pricing, or reliability benefits---are included.

***E. Battery Storage: An Analytical Explanation of Non-Selection***

Battery storage is not selected at any retrofit stage. This is explained analytically by the very low PV curtailment under the no-export constraint: curtailment ranges from 377 kWh/yr at S0 (0.05% of annual PV output of 732,958 kWh/yr) to 15,528 kWh/yr at S4 (2.12%). The maximum annual economic value of dispatchable curtailment surplus at the current tariff is 15,528 × USD 0.085 = USD 1,320/yr, equivalent to a 25-year present value of USD 1,320 × 12.79 = USD 16,883. This cannot justify any positive battery capacity at current capital costs (USD 300/kWh, plus replacement at year 15 and ongoing O&M).

The effective battery CAPEX threshold for viability---even neglecting replacement and O&M costs---is approximately USD 16,883 / \[(15,528/365) × 365\] ≈ USD 390/kWh, which is already close to prevailing market prices and leaves no economic margin once realistic replacement and O&M provisions are added. The flat tariff structure also removes the time-of-use arbitrage opportunity that would otherwise add value to storage. Battery storage becomes potentially viable only if (i) PV curtailment rises substantially through higher PV deployment, (ii) tariff structures evolve to reward time-of-use shifting, or (iii) battery capital costs fall below approximately USD 200/kWh, in line with the projections of recent NREL battery cost forecasts \[27\].

***F. CO₂ Implications***

At the NPC-optimal stage S3, CO₂ emissions are reduced by 751,504 kg/yr (−16.0%) relative to the baseline (4,697,728 kg/yr). S4 would reduce emissions further to 3,306,679 kg/yr (−29.6% relative to baseline); however, this additional 639,545 kg/yr reduction cannot be justified on economic grounds alone under present cost parameters. A shadow carbon price of approximately USD 220/tCO₂ would be required to render Package D NPC-neutral when combined with its energy-savings benefit---well above current voluntary carbon market prices.

***G. Limitations***

Three limitations should be noted. First, the analysis is based on a single building: the numerical outputs (S\* = S3, NPC saving USD 362,919, τ\* = USD 0.194/kWh) are specific to this building and tariff context. The framework itself is transferable, but the specific values require recalibration for different buildings. Second, the demand profiles are static: EnergyPlus represents typical-year operation, and real-world demand variability will affect absolute NPC values. The conclusion that S3 is optimal is unlikely to change, however, given the large magnitude (ΔNPC4 \> USD 1.4 M) of the S3→S4 reversal. Third, the SEC block-rate tariff is approximated as a flat USD 0.085/kWh in HOMER; more detailed tariff modelling could shift absolute NPC values somewhat, but the crossover conclusion is robust to perturbations smaller than the S3→S4 economic penalty.

**VI. CONCLUSION**

This paper examined the stage-wise techno-economic crossover between cumulative building energy retrofits and roof-constrained rooftop PV deployment under a no-export operating condition for a cooling-dominated commercial building in Jeddah, Saudi Arabia. A calibrated EnergyPlus--HOMER Pro framework was used to generate hourly demand profiles for five retrofit stages (S0--S4) and to identify the NPC-minimising crossover by combining the HOMER energy-system NPC with the cumulative present value of retrofit packages. Three principal findings emerge.

First, the roof-derived 400 kWp capacity cap is binding across all retrofit depths in this 11-floor building typology, demonstrating that PV sizing is structurally decoupled from retrofit depth: installing maximum feasible rooftop PV is always optimal, and the two investment decisions can be made independently. Second, the NPC-minimising crossover occurs at Stage 3---LED rationalisation, operational controls and VFD optimisation, and glazing/shading improvements (cumulative CAPEX USD 917,532)---delivering a 25-year total NPC of USD 8.21 M and a saving of USD 362,919 (4.2%) relative to the USD 8.57 M baseline; Stage 4 (HVAC plant upgrade) is therefore the energy-optimal but not the economically optimal stage, since its USD 2.70 M CAPEX is not recovered at the current tariff. Third, the analytical break-even tariff for the HVAC plant upgrade is τ\* = USD 0.194/kWh, approximately 128% above the current SEC commercial rate, which provides a quantitative trigger for reassessing this investment as tariff reform progresses. Battery storage is not selected at any stage in the HOMER optimisation; PV curtailment under the no-export, flat-tariff, roof-capped configuration is too small (≤ 2.1% of annual PV output) to support storage at current capital costs.

In practical terms, building owners in comparable Gulf commercial contexts are recommended to prioritise operational and envelope retrofits (Packages A--C) alongside maximum feasible rooftop PV, while deferring major HVAC plant replacement until grid tariffs approach the USD 0.194/kWh threshold or other value streams (demand-charge reduction, carbon pricing, reliability benefits) materialise. Future work will extend the framework to parametric tariff sensitivity under Vision 2030 scenarios, examine battery viability under time-of-use pricing, and apply the coupled methodology to additional building typologies across the GCC region.

**REFERENCES**

\[1\]International Energy Agency, \"Peak electricity demand in buildings by end-use, 2022--2050,\" IEA, Paris, France, 2024.

\[2\]International Energy Agency, Renewables 2024: Analysis and Forecast to 2030. Paris, France: IEA, Oct. 2024.

\[3\]J. Joshi, S. Sawant, V. R. K. R. Reddy, et al., \"High-resolution global spatiotemporal assessment of rooftop solar PV potential,\" Nature Communications, vol. 12, art. 5738, 2021, doi: 10.1038/s41467-021-25720-2.

\[4\]X. Duan, Y. Han, and L. Zhang, \"Design and comprehensive assessment of roof photovoltaic retrofits for existing buildings,\" Solar Energy, vol. 288, art. 113280, 2025, doi: 10.1016/j.solener.2024.113280.

\[5\]A. Allouhi, \"Solar PV integration in commercial buildings for self-consumption based on lifecycle optimisation,\" Journal of Cleaner Production, vol. 270, art. 122375, 2020, doi: 10.1016/j.jclepro.2020.122375.

\[6\]D. Ürge-Vorsatz, S. Tirado Herrero, and N. K. Dubash, \"Global and regional estimation of suitable roof area for solar and green-roof applications,\" Developments in the Built Environment, vol. 21, art. 100607, 2025, doi: 10.1016/j.dibe.2024.100607.

\[7\]C. C. de Oliveira, I. C. M. Vaz, and E. Ghisi, \"Retrofit strategies to improve energy efficiency in buildings: An integrative review,\" Energy and Buildings, vol. 321, art. 114624, 2024, doi: 10.1016/j.enbuild.2024.114624.

\[8\]N. Madushika, G. Kumarapperuma, and N. Gamage, \"Energy retrofitting technologies of buildings: A review-based assessment,\" Energies, vol. 16, no. 13, art. 4924, 2023, doi: 10.3390/en16134924.

\[9\]S. van Roosmale, P. Hellinckx, S. Verbeke, and A. Audenaert, \"Building automation and control systems for office buildings: Technical insights for effective facility management,\" Journal of Building Engineering, vol. 97, art. 110943, 2024, doi: 10.1016/j.jobe.2024.110943.

\[10\]L. Vandenbogaerde, S. Verbeke, and A. Audenaert, \"Optimising building energy consumption in office buildings: A review,\" Journal of Building Engineering, vol. 76, art. 107233, 2023, doi: 10.1016/j.jobe.2023.107233.

\[11\]F. Moveh, A. K. Sharma, and R. K. Singh, \"Thermodynamic optimisation of building HVAC systems through dynamic modelling and advanced machine learning,\" Sustainability, vol. 17, no. 5, art. 1955, 2025, doi: 10.3390/su17051955.

\[12\]M. M. Al-Tamimi, A. A. Fadzil, and L. W. Harun, \"Building envelope retrofitting strategies for energy-efficient office buildings in Saudi Arabia,\" Buildings, vol. 12, no. 11, art. 1900, 2022, doi: 10.3390/buildings12111900.

\[13\]Y. Abdou, A. Al-Sallal, and A. AbdelGawad, \"Energy optimisation for fenestration design: Evidence-based retrofitting for office buildings in the UAE,\" Buildings, vol. 12, no. 10, art. 1541, 2022, doi: 10.3390/buildings12101541.

\[14\]M. Pachano and J. M. Fernández Bandera, \"Multi-step building energy model calibration process based on measured data,\" Energy and Buildings, vol. 252, art. 111380, 2021, doi: 10.1016/j.enbuild.2021.111380.

\[15\]F. Ascione, R. F. De Masi, M. Mastellone, S. Ruggiero, and G. P. Vanoli, \"Calibration of an EnergyPlus simulation model and validation through monitoring data,\" Energies, vol. 18, no. 4, art. 905, 2025, doi: 10.3390/en18040905.

\[16\]N. H. Johari, W. S. Alaloul, and M. A. Musarat, \"Recent advancements of life-cycle cost analysis of PV systems,\" International Journal of Life Cycle Assessment, vol. 30, pp. 731--752, 2025, doi: 10.1007/s11367-024-02411-w.

\[17\]D. Ribó-Pérez, T. Gómez, and J. Reneses, \"Future electricity tariffs: Designing electricity rates fit for the energy transition,\" Energy Policy, vol. 202, art. 114596, 2025, doi: 10.1016/j.enpol.2025.114596.

\[18\]Saudi Building Code National Committee, Saudi Building Code---Energy Conservation Requirements (SBC 601) and Energy Conservation Requirements---Residential (SBC 602). Riyadh, Saudi Arabia: SBCNC, 2018.

\[19\]ASHRAE, ANSI/ASHRAE/IES Standard 90.1-2022: Energy Standard for Sites and Buildings Except Low-Rise Residential Buildings. Atlanta, GA, USA: ASHRAE, 2022.

\[20\]M. Aldubyan and M. Krarti, \"Future of residential electricity demand in Saudi Arabia and the role of energy efficiency in the 2060 net-zero pledge,\" Developments in Sustainable Economy and Finance, art. 100086, 2025, doi: 10.1016/j.dsef.2025.100086.

\[21\]M. A. Aloshan and K. Aldali, \"The role of regional codes in mitigating residential-sector energy demand sensitivity to climate-change scenarios in hot--arid regions,\" Buildings, vol. 15, no. 11, art. 1789, 2025, doi: 10.3390/buildings15111789.

\[22\]U.S. Department of Energy, EnergyPlus Engineering Reference, version 25.1.0. Washington, DC, USA: U.S. DOE / NREL, 2025. \[Online\]. Available: https://energyplus.net

\[23\]ASHRAE, ASHRAE Guideline 14-2014: Measurement of Energy, Demand, and Water Savings. Atlanta, GA, USA: ASHRAE, 2014.

\[24\]NASA Langley Research Center, \"NASA POWER: Prediction of Worldwide Energy Resources---Surface Meteorology and Solar Energy,\" 2024. \[Online\]. Available: https://power.larc.nasa.gov

\[25\]UL Solutions, \"HOMER Pro Software Documentation,\" 2024. \[Online\]. Available: https://www.homerenergy.com

\[26\]Saudi Electricity Company, \"Consumption Tariffs for Commercial Customers,\" SEC, Riyadh, Saudi Arabia, 2024. \[Online\]. Available: https://www.se.com.sa

\[27\]W. Cole, A. Karmakar, and P. Denholm, Cost Projections for Utility-Scale Battery Storage: 2024 Update, NREL, Golden, CO, USA, Tech. Rep. NREL/TP-6A40-89018, 2024.

\[28\]Whole Building Design Guide (WBDG), \"Lighting Controls,\" National Institute of Building Sciences, Washington, DC, USA, 2023. \[Online\]. Available: https://www.wbdg.org

\[29\]K. Field, M. Deru, A. Watson, et al., Cost-Effectiveness of Sensors and Controls in Commercial Buildings, NREL, Golden, CO, USA, Tech. Rep. NREL/TP-5500-83693, 2022.

\[30\]S. T. Crowe, S. R. Schiller, J. Granderson, and E. C. Shockman, \"The cost of commercial-building commissioning: Updated benchmarks,\" Lawrence Berkeley National Laboratory, Berkeley, CA, USA, LBNL-2001329, 2020.

\[31\]U.S. General Services Administration, GPG-032: Solar-Control Window Films, GSA Office of Federal High-Performance Buildings, Washington, DC, USA, 2017.

\[32\]U.S. Department of Energy, Building Technologies Office: Commercial HVAC Cost Database. Washington, DC, USA: DOE, 2022. \[Online\]. Available: https://www.energy.gov/eere/buildings

\[33\]U.S. Environmental Protection Agency, ENERGY STAR Building Upgrade Manual: HVAC Systems and Controls. Washington, DC, USA: EPA, 2018.
