export interface Junction {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Edge {
  source: string;
  target: string;
  corridor: string;
  cascadeProbability: number;
}

class GraphService {
  public junctions: Map<string, Junction>;
  public adjacencyList: Map<string, Edge[]>;

  constructor() {
    this.junctions = new Map();
    this.adjacencyList = new Map();
    this.initializeGraph();
  }

  private initializeGraph() {
    // Auto-generated from Astram dataset — 294 unique junctions
    const junctions: Junction[] = [
      { id: 'mekhriCircle', name: 'MekhriCircle', lat: 13.014602, lon: 77.583981 }, // count=64, Bellary Road 1
      { id: 'ayyappaTempleJunc', name: 'AyyappaTempleJunc', lat: 12.923716, lon: 77.618662 }, // count=49, Hosur Road
      { id: 'satteliteBusStandJunc', name: 'SatteliteBusStandJunc', lat: 12.954126, lon: 77.543464 }, // count=43, Mysore Road
      { id: 'yeshwanthpuraCircle', name: 'YeshwanthpuraCircle', lat: 13.017761, lon: 77.556973 }, // count=38, Tumkur Road
      { id: 'yelhankaCircle', name: 'YelhankaCircle', lat: 13.094322, lon: 77.595927 }, // count=34, Bellary Road 2
      { id: 'silkBoardJunc', name: 'SilkBoardJunc', lat: 12.917013, lon: 77.622874 }, // count=33, ORR East 1
      { id: 'toll_gate_mysore_road', name: 'toll gate mysore road', lat: 12.957494, lon: 77.551884 }, // count=33, Mysore Road
      { id: 'jalahalliCross_SM_Circle', name: 'JalahalliCross(SM Circle)', lat: 13.040089, lon: 77.518302 }, // count=32, Tumkur Road
      { id: 'nagavara_ORR_Junction', name: 'Nagavara-ORR Junction', lat: 13.039600, lon: 77.624190 }, // count=32, Hennur Main Road
      { id: 'k_R_Circle', name: 'K R Circle', lat: 12.976696, lon: 77.586048 }, // count=31, Non-corridor
      { id: 'kIMCO_Junction', name: 'KIMCO Junction', lat: 12.951140, lon: 77.538003 }, // count=31, West of Chord Road
      { id: 'veerannapalyaJunction_BEL_HO', name: 'VeerannapalyaJunction(BEL,HO)', lat: 13.041578, lon: 77.613660 }, // count=30, ORR North 1
      { id: 'townhallJunction', name: 'TownhallJunction', lat: 12.963982, lon: 77.584377 }, // count=30, Mysore Road
      { id: 'hesaraghattaJunction', name: 'HesaraghattaJunction', lat: 13.045216, lon: 77.507432 }, // count=30, Tumkur Road
      { id: 'devasandra_k_r_puram', name: 'Devasandra(k r puram)', lat: 13.009463, lon: 77.696157 }, // count=30, Non-corridor
      { id: 'koramangalaWaterTankJunc', name: 'KoramangalaWaterTankJunc', lat: 12.927340, lon: 77.620973 }, // count=29, IRR(Thanisandra road)
      { id: 'hebbalFlyoverJunc', name: 'HebbalFlyoverJunc', lat: 13.042259, lon: 77.590922 }, // count=28, Bellary Road 1
      { id: 'gokuldasImagesJunc', name: 'GokuldasImagesJunc', lat: 13.030656, lon: 77.536423 }, // count=28, Tumkur Road
      { id: 'bagalurCrossJunc', name: 'BagalurCrossJunc', lat: 13.122026, lon: 77.610863 }, // count=27, Bellary Road 2
      { id: 'bigBazaarJunction_OldMadrasRd', name: 'BigBazaarJunction(OldMadrasRd)', lat: 12.991387, lon: 77.657421 }, // count=26, Old Madras Road
      { id: 'policeCornerJunc', name: 'PoliceCornerJunc', lat: 12.968715, lon: 77.587036 }, // count=26, Mysore Road
      { id: 'bommanahalli', name: 'Bommanahalli', lat: 12.906964, lon: 77.628165 }, // count=26, Hosur Road
      { id: 'santheCircle', name: 'SantheCircle', lat: 13.097470, lon: 77.598195 }, // count=25, Bellary Road 2
      { id: 'bEL_Circle', name: 'BEL Circle', lat: 13.044357, lon: 77.555854 }, // count=25, ORR North 2
      { id: 'khodaysCircle_DV_UrsCircle', name: 'KhodaysCircle(DV UrsCircle)', lat: 12.980188, lon: 77.571559 }, // count=23, Non-corridor
      { id: 'rajeshwariJunc', name: 'RajeshwariJunc', lat: 12.936725, lon: 77.519071 }, // count=22, Mysore Road
      { id: 'leprosyhospitalJunc', name: 'LeprosyhospitalJunc', lat: 12.975538, lon: 77.564240 }, // count=21, Magadi Road
      { id: 'cMP_GateJunc', name: 'CMP GateJunc', lat: 12.957914, lon: 77.605855 }, // count=20, Hosur Road
      { id: 'sRS_Peenya_Junc', name: 'SRS Peenya Junc', lat: 13.034509, lon: 77.529849 }, // count=20, Tumkur Road
      { id: 'goruguntepalyaJunc', name: 'GoruguntepalyaJunc', lat: 13.029652, lon: 77.540355 }, // count=20, Tumkur Road
      { id: 'mysoreRd_RingRdJunc_Nayandanahallii', name: 'MysoreRd-RingRdJunc(Nayandanahallii)', lat: 12.944787, lon: 77.527305 }, // count=19, ORR West 1
      { id: 'krishnaFlourMill', name: 'KrishnaFlourMill', lat: 12.984845, lon: 77.573051 }, // count=19, Non-corridor
      { id: 'bangaloreBodyBuildersJunc', name: 'BangaloreBodyBuildersJunc', lat: 12.959080, lon: 77.555492 }, // count=19, Mysore Road
      { id: 'yelhankaBypass', name: 'YelhankaBypass', lat: 13.082246, lon: 77.593429 }, // count=19, Bellary Road 2
      { id: 'jakkurCrossJunction', name: 'JakkurCrossJunction', lat: 13.073616, lon: 77.592855 }, // count=18, Bellary Road 2
      { id: 'hennurRoad_ORR_Junc', name: 'HennurRoad-ORR Junc', lat: 13.029221, lon: 77.631699 }, // count=17, Airport New South Road
      { id: 'sumanhalli', name: 'Sumanhalli', lat: 12.986788, lon: 77.520432 }, // count=16, Magadi Road
      { id: 'indianExpressJunction', name: 'IndianExpressJunction', lat: 12.984154, lon: 77.597362 }, // count=16, CBD 2
      { id: 'shivajinagar_BRV_Junction', name: 'Shivajinagar(BRV)Junction', lat: 12.979665, lon: 77.602709 }, // count=16, Old Madras Road
      { id: 'maratahalliBridgeJunc', name: 'MaratahalliBridgeJunc', lat: 12.956365, lon: 77.700618 }, // count=16, Varthur Road
      { id: 'hudsonCircle', name: 'HudsonCircle', lat: 12.967817, lon: 77.590309 }, // count=16, Mysore Road
      { id: 'arakereGateJunc', name: 'ArakereGateJunc', lat: 12.890590, lon: 77.597709 }, // count=15, Bannerghata Road
      { id: 'bloodBankCircle', name: 'BloodBankCircle', lat: 12.962146, lon: 77.594476 }, // count=15, Non-corridor
      { id: 'shantalaJunction', name: 'ShantalaJunction', lat: 12.974563, lon: 77.570280 }, // count=15, Non-corridor
      { id: 'deverabeesanahalli_ORR_Junc', name: 'Deverabeesanahalli-ORR Junc', lat: 12.930818, lon: 77.685054 }, // count=15, ORR East 1
      { id: 'kogilluCrossJunc', name: 'KogilluCrossJunc', lat: 13.104882, lon: 77.601116 }, // count=15, Bellary Road 2
      { id: 'uttarahalliJunction', name: 'UttarahalliJunction', lat: 12.905855, lon: 77.544965 }, // count=15, Non-corridor
      { id: 'policeTimmaiahCircle_GPO', name: 'PoliceTimmaiahCircle(GPO)', lat: 12.982201, lon: 77.594184 }, // count=14, CBD 2
      { id: 'batrayanapura_Amrutahalli_Junction', name: 'Batrayanapura(Amrutahalli)Junction', lat: 13.067097, lon: 77.592892 }, // count=14, Bellary Road 2
      { id: 'chokasandra_Tumkur_road', name: 'Chokasandra (Tumkur road)', lat: 13.042173, lon: 77.514710 }, // count=14, Tumkur Road
      { id: 'bilekahalliJunc', name: 'BilekahalliJunc', lat: 12.900502, lon: 77.600950 }, // count=14, Bannerghata Road
      { id: 'srigandakaval', name: 'Srigandakaval', lat: 12.988481, lon: 77.510161 }, // count=14, Magadi Road
      { id: 'tumkurRdMarappanapalyaJunc', name: 'TumkurRdMarappanapalyaJunc', lat: 13.018958, lon: 77.553145 }, // count=14, Tumkur Road
      { id: 'ibblurJunction', name: 'IbblurJunction\'', lat: 12.921297, lon: 77.664643 }, // count=13, ORR East 1
      { id: 'banashankariBusStandJunc', name: 'BanashankariBusStandJunc', lat: 12.916915, lon: 77.572784 }, // count=13, Non-corridor
      { id: 'marigowda_TavarkereRdJunc', name: 'Marigowda-TavarkereRdJunc', lat: 12.935764, lon: 77.607807 }, // count=13, Non-corridor
      { id: 'sadashivnagarJunc', name: 'SadashivnagarJunc', lat: 13.015022, lon: 77.572651 }, // count=13, Non-corridor
      { id: 'katriguppeJunction', name: 'KatriguppeJunction', lat: 12.925435, lon: 77.549923 }, // count=12, ORR West 1
      { id: 'tataInstituteCircle', name: 'TataInstituteCircle', lat: 13.014360, lon: 77.565585 }, // count=12, Tumkur Road
      { id: 'peenyaPoliceStation', name: 'PeenyaPoliceStation', lat: 13.037161, lon: 77.522454 }, // count=12, Tumkur Road
      { id: 'naganathapuraJunction', name: 'NaganathapuraJunction', lat: 12.870340, lon: 77.653005 }, // count=12, Hosur Road
      { id: 'ulsoorGateJunc', name: 'UlsoorGateJunc', lat: 12.966829, lon: 77.587479 }, // count=12, Mysore Road
      { id: 'stateBankofMysoreJunc', name: 'StateBankofMysoreJunc', lat: 12.973675, lon: 77.582230 }, // count=12, Non-corridor
      { id: 'dr_TCM_RoyanRd_near_AmbedkarStatue', name: 'Dr TCM RoyanRd near AmbedkarStatue', lat: 12.965155, lon: 77.568074 }, // count=12, Mysore Road
      { id: 'domlurWaterTank', name: 'DomlurWaterTank', lat: 12.961041, lon: 77.638875 }, // count=12, Old Airport Road
      { id: 'shivandaCircle', name: 'ShivandaCircle', lat: 12.987866, lon: 77.579683 }, // count=12, Non-corridor
      { id: 'oldMadrasRd_Indranagar100ftRdJunc', name: 'OldMadrasRd-Indranagar100ftRdJunc', lat: 12.984077, lon: 77.641123 }, // count=12, Old Madras Road
      { id: 'kadubeesanahalli_ORR_Junc', name: 'Kadubeesanahalli-ORR Junc', lat: 12.939467, lon: 77.696188 }, // count=12, ORR East 1
      { id: 'horamavuJunction', name: 'HoramavuJunction', lat: 13.018760, lon: 77.656383 }, // count=12, ORR North 1
      { id: 'bucheryJunction', name: 'BucheryJunction', lat: 12.952048, lon: 77.621485 }, // count=11, Non-corridor
      { id: 'trinityCircle', name: 'TrinityCircle', lat: 12.971906, lon: 77.619343 }, // count=11, Old Madras Road
      { id: 'richmond_circle_jn', name: 'Richmond circle jn', lat: 12.965108, lon: 77.596268 }, // count=11, Mysore Road
      { id: 'veerasandraGateJunction', name: 'VeerasandraGateJunction', lat: 12.839785, lon: 77.677143 }, // count=11, Non-corridor
      { id: 'fTI_Junction_KanteeravaStudio', name: 'FTI Junction(KanteeravaStudio)', lat: 13.021224, lon: 77.531433 }, // count=11, Non-corridor
      { id: 'kundanahalliGateJunc', name: 'KundanahalliGateJunc', lat: 12.955881, lon: 77.716814 }, // count=11, Varthur Road
      { id: 'siddalingaiahCircle', name: 'SiddalingaiahCircle', lat: 12.971612, lon: 77.594458 }, // count=11, Mysore Road
      { id: 'mS_RamaiahJunc_TollGate', name: 'MS RamaiahJunc(TollGate)', lat: 13.017081, lon: 77.560761 }, // count=11, Tumkur Road
      { id: 'motherTeressaCircle', name: 'MotherTeressaCircle', lat: 12.966578, lon: 77.608974 }, // count=11, Mysore Road
      { id: 'kodigehalliCross', name: 'KodigehalliCross', lat: 13.055507, lon: 77.593845 }, // count=11, Bellary Road 1
      { id: 'universityJunc_Janabharti', name: 'UniversityJunc(Janabharti)', lat: 12.935896, lon: 77.512553 }, // count=11, Mysore Road
      { id: 'bMTCJunction_K_H_Road', name: 'BMTCJunction-K H Road', lat: 12.956572, lon: 77.593179 }, // count=10, Non-corridor
      { id: 'arbindo_Circle', name: 'Arbindo Circle', lat: 12.917281, lon: 77.585654 }, // count=10, Non-corridor
      { id: 'hopefarmJunction', name: 'HopefarmJunction', lat: 12.984360, lon: 77.752453 }, // count=10, Non-corridor
      { id: 'sarjapurRd_St_JohnsRdJunc', name: 'SarjapurRd-St JohnsRdJunc', lat: 12.927888, lon: 77.615948 }, // count=10, Hosur Road
      { id: 'n_R_SquareJunc', name: 'N R SquareJunc', lat: 12.965461, lon: 77.586563 }, // count=10, Mysore Road
      { id: 'queensStatueCircle', name: 'QueensStatueCircle', lat: 12.977182, lon: 77.599247 }, // count=9, Old Madras Road
      { id: 'cID_CarltonHouseJunc', name: 'CID-CarltonHouseJunc', lat: 12.980355, lon: 77.586363 }, // count=9, Non-corridor
      { id: 'sirsiCircle', name: 'SirsiCircle', lat: 12.961263, lon: 77.560491 }, // count=9, Mysore Road
      { id: 'sindhiColonyJunction', name: 'SindhiColonyJunction', lat: 12.994906, lon: 77.616059 }, // count=9, Non-corridor
      { id: 'hulimaveRd_BanneraghattaRdJunc', name: 'HulimaveRd-BanneraghattaRdJunc', lat: 12.881815, lon: 77.596070 }, // count=9, Bannerghata Road
      { id: 'subbannaJunction', name: 'SubbannaJunction', lat: 12.982947, lon: 77.576782 }, // count=9, Non-corridor
      { id: 'iSRO_Junction_Airport_rd', name: 'ISRO Junction-Airport rd', lat: 12.959247, lon: 77.655465 }, // count=9, Old Airport Road
      { id: 'kanakapuraRd_RingRdJunction', name: 'KanakapuraRd-RingRdJunction', lat: 12.905958, lon: 77.573232 }, // count=9, ORR West 1
      { id: 'millCornerRd_SampigeRdJunc', name: 'MillCornerRd-SampigeRdJunc', lat: 12.992266, lon: 77.571454 }, // count=9, Non-corridor
      { id: 'karnatakaBhavanJunction', name: 'KarnatakaBhavanJunction', lat: 12.981451, lon: 77.564763 }, // count=9, Non-corridor
      { id: 'lRDE_Junction', name: 'LRDE Junction', lat: 12.987409, lon: 77.588112 }, // count=9, Bellary Road 1
      { id: 'nagarbhavi', name: 'Nagarbhavi', lat: 12.958795, lon: 77.517881 }, // count=9, Non-corridor
      { id: 'ramamurthyNagarJunction', name: 'RamamurthyNagarJunction', lat: 13.015188, lon: 77.661266 }, // count=9, ORR North 1
      { id: 'ramaiahCircle_UlsoorPoliceStation', name: 'RamaiahCircle-UlsoorPoliceStation', lat: 12.975644, lon: 77.625934 }, // count=9, Old Madras Road
      { id: 'coffeeBoardJunc', name: 'CoffeeBoardJunc', lat: 12.983248, lon: 77.595647 }, // count=8, CBD 2
      { id: 'subedarChatramRd_near_SheshadripuramPS', name: 'SubedarChatramRd near SheshadripuramPS', lat: 12.987519, lon: 77.574050 }, // count=8, Non-corridor
      { id: 'bigBazaar_Whitefield_Junc', name: 'BigBazaar(Whitefield)Junc', lat: 12.988110, lon: 77.733230 }, // count=8, Non-corridor
      { id: 'purnimaTheaterJunc', name: 'PurnimaTheaterJunc', lat: 12.960361, lon: 77.587656 }, // count=8, Non-corridor
      { id: 'jayadevaHospitalJunc', name: 'JayadevaHospitalJunc', lat: 12.915538, lon: 77.600118 }, // count=8, Bannerghata Road
      { id: 'wilsonGarden12thCrossJunc', name: 'WilsonGarden12thCrossJunc', lat: 12.944529, lon: 77.596889 }, // count=8, Non-corridor
      { id: 'meenakshiMallJunc', name: 'MeenakshiMallJunc', lat: 12.876471, lon: 77.595132 }, // count=8, Bannerghata Road
      { id: 'oldMadrasRd_NGEF_Junc', name: 'OldMadrasRd-NGEF Junc', lat: 12.986754, lon: 77.648306 }, // count=8, Old Madras Road
      { id: 'sandeepUnnikrishnan_Yelhanka', name: 'SandeepUnnikrishnan-Yelhanka', lat: 13.101340, lon: 77.586019 }, // count=8, Non-corridor
      { id: 'minskSquare_CTO_Junction', name: 'MinskSquare(CTO Junction)', lat: 12.981687, lon: 77.597434 }, // count=8, CBD 2
      { id: 'anilKumbleCircle', name: 'AnilKumbleCircle', lat: 12.976364, lon: 77.601521 }, // count=8, Old Madras Road
      { id: 'oldMadrasRd_80FeetRdJunc', name: 'OldMadrasRd-80FeetRdJunc', lat: 12.985834, lon: 77.645409 }, // count=8, Old Madras Road
      { id: 'kadirenahalliJunction', name: 'KadirenahalliJunction', lat: 12.916273, lon: 77.565058 }, // count=8, ORR West 1
      { id: 'ringRoad_UllalJunction', name: 'RingRoad-UllalJunction', lat: 12.951783, lon: 77.499746 }, // count=7, Non-corridor
      { id: 'jP_Nagar_15th_cross_junction', name: 'JP Nagar 15th cross junction', lat: 12.906214, lon: 77.585735 }, // count=7, ORR West 1
      { id: 'hunsemarammanahalliJunction', name: 'HunsemarammanahalliJunction', lat: 13.142240, lon: 77.617707 }, // count=7, Bellary Road 2
      { id: 'binnyMillJunction', name: 'BinnyMillJunction', lat: 12.970069, lon: 77.567970 }, // count=7, Non-corridor
      { id: 'chaudrayaCircle_UdayaTVCircle_CantonmentJunc', name: 'ChaudrayaCircle/UdayaTVCircle(CantonmentJunc)', lat: 12.994135, lon: 77.595638 }, // count=7, Non-corridor
      { id: 'shivajiTalkiesJunc', name: 'ShivajiTalkiesJunc', lat: 12.962568, lon: 77.582476 }, // count=7, Mysore Road
      { id: 'dhobiGhatJunc', name: 'DhobiGhatJunc', lat: 12.986880, lon: 77.550602 }, // count=7, West of Chord Road
      { id: 'ring_road_Near_Kengunte_Junction', name: 'Ring road-Near Kengunte Junction', lat: 12.959365, lon: 77.503983 }, // count=7, Non-corridor
      { id: 'sadahalliGateJunc_AirportRd', name: 'SadahalliGateJunc(AirportRd)', lat: 13.190765, lon: 77.645835 }, // count=7, Bellary Road 2
      { id: 'k_R_MarketJunction', name: 'K R MarketJunction', lat: 12.963905, lon: 77.578336 }, // count=7, Mysore Road
      { id: 'anandRaoJunction', name: 'AnandRaoJunction', lat: 12.981351, lon: 77.574184 }, // count=7, Non-corridor
      { id: 'urvashiJunction', name: 'UrvashiJunction', lat: 12.955621, lon: 77.585736 }, // count=6, Non-corridor
      { id: 'lalbaghMainGateJunc', name: 'LalbaghMainGateJunc', lat: 12.953933, lon: 77.585664 }, // count=6, Non-corridor
      { id: '28thMainJayanagarJunc', name: '28thMainJayanagarJunc', lat: 12.916833, lon: 77.595374 }, // count=6, Non-corridor
      { id: 'wilsonGarden10thCrossJunc', name: 'WilsonGarden10thCrossJunc', lat: 12.946021, lon: 77.595616 }, // count=6, Non-corridor
      { id: 'mICO_Bande', name: 'MICO Bande', lat: 12.945653, lon: 77.602805 }, // count=6, Non-corridor
      { id: 'hainsJunc', name: 'HainsJunc', lat: 12.994184, lon: 77.606657 }, // count=6, Non-corridor
      { id: 'anepalyaJunc', name: 'AnepalyaJunc', lat: 12.951754, lon: 77.605330 }, // count=6, Hosur Road
      { id: 'priyadarshiniHotel_Jayamahal_RT_Nagar', name: 'PriyadarshiniHotel,Jayamahal,RT Nagar', lat: 13.001852, lon: 77.594520 }, // count=6, Non-corridor
      { id: 'kalyanNagar_ORR_Junc', name: 'KalyanNagar-ORR Junc', lat: 13.024158, lon: 77.643752 }, // count=6, ORR North 1
      { id: 'commandoHospitalJunc', name: 'CommandoHospitalJunc', lat: 12.966297, lon: 77.624507 }, // count=6, Non-corridor
      { id: 'ashoknagar_Junction_ShoolayCircle', name: 'Ashoknagar Junction(ShoolayCircle)', lat: 12.966321, lon: 77.606419 }, // count=6, Mysore Road
      { id: 'margosaRd_18thCrossJunc', name: 'MargosaRd-18thCrossJunc', lat: 13.011095, lon: 77.569338 }, // count=6, Non-corridor
      { id: 'platformRdJunction', name: 'PlatformRdJunction', lat: 12.981695, lon: 77.570236 }, // count=6, Non-corridor
      { id: 'sagarTheatreJunc', name: 'SagarTheatreJunc', lat: 12.974529, lon: 77.578709 }, // count=6, Non-corridor
      { id: 'rRR_Okalipuram_Junction', name: 'RRR(Okalipuram)Junction', lat: 12.982383, lon: 77.567775 }, // count=6, Non-corridor
      { id: 'electronicCityGate_2Junc', name: 'ElectronicCityGate-2Junc', lat: 12.855327, lon: 77.664955 }, // count=6, Non-corridor
      { id: 'k_H_Road_SiddaiahRdJunc_BMTC_BigBazaar', name: 'K H Road-SiddaiahRdJunc(BMTC-BigBazaar)', lat: 12.952732, lon: 77.590746 }, // count=6, Non-corridor
      { id: 'eliteJunc', name: 'EliteJunc', lat: 12.976210, lon: 77.575148 }, // count=6, Non-corridor
      { id: 'mC_Circle', name: 'MC Circle', lat: 12.976118, lon: 77.547780 }, // count=6, West of Chord Road
      { id: 'bTM16thMain_ORR_Junc', name: 'BTM16thMain-ORR Junc', lat: 12.916279, lon: 77.609749 }, // count=6, Non-corridor
      { id: 'kudlu_Gate_Junc', name: 'Kudlu Gate Junc', lat: 12.889439, lon: 77.639454 }, // count=6, Hosur Road
      { id: 'nIMHANS_Junction', name: 'NIMHANS Junction', lat: 12.940404, lon: 77.597746 }, // count=6, Non-corridor
      { id: 'agaraJunction', name: 'AgaraJunction', lat: 12.923732, lon: 77.649706 }, // count=6, ORR East 1
      { id: 'itmaduJunction', name: 'ItmaduJunction', lat: 12.927948, lon: 77.546455 }, // count=6, ORR West 1
      { id: 'hoodiJunction', name: 'HoodiJunction', lat: 12.992636, lon: 77.715755 }, // count=6, Non-corridor
      { id: 'prasannaJunction', name: 'PrasannaJunction', lat: 12.975611, lon: 77.553418 }, // count=6, Magadi Road
      { id: 'operaHouseJunc', name: 'OperaHouseJunc', lat: 12.971987, lon: 77.607125 }, // count=6, Mysore Road
      { id: 'rajajinagar19thMainJunc', name: 'Rajajinagar19thMainJunc', lat: 12.997701, lon: 77.551241 }, // count=6, West of Chord Road
      { id: 'konanakunteJunction_KanakapurarRd', name: 'KonanakunteJunction(KanakapurarRd)', lat: 12.890110, lon: 77.564204 }, // count=6, Non-corridor
      { id: 'bDA_Junctio_Koramangala', name: 'BDA Junctio-Koramangala', lat: 12.931545, lon: 77.622682 }, // count=6, IRR(Thanisandra road)
      { id: 'gangammagudiJunc', name: 'GangammagudiJunc', lat: 13.056798, lon: 77.546629 }, // count=6, Non-corridor
      { id: 'vijayanagarBusStandJunction', name: 'VijayanagarBusStandJunction', lat: 12.973222, lon: 77.539480 }, // count=6, West of Chord Road
      { id: 'potteryCircle', name: 'PotteryCircle', lat: 13.002102, lon: 77.612236 }, // count=5, Non-corridor
      { id: 'mintoJunction', name: 'MintoJunction', lat: 12.960096, lon: 77.571999 }, // count=5, Non-corridor
      { id: 'mahalaxmiLayoutEntranceJunc', name: 'MahalaxmiLayoutEntranceJunc', lat: 13.009674, lon: 77.548844 }, // count=5, West of Chord Road
      { id: 'dr_RajkumarRd_10thCrossRdJunc', name: 'Dr RajkumarRd-10thCrossRdJunc', lat: 13.007386, lon: 77.554029 }, // count=5, Non-corridor
      { id: 'shivashankara_circle', name: 'Shivashankara circle', lat: 12.957756, lon: 77.574041 }, // count=5, Non-corridor
      { id: 'malleswaram18thCrossRd_SampigeRdJunc', name: 'Malleswaram18thCrossRd-SampigeRdJunc', lat: 13.008670, lon: 77.571503 }, // count=5, Non-corridor
      { id: 'tyagiHengalvarayaJunc_DickensonRd', name: 'TyagiHengalvarayaJunc(DickensonRd)', lat: 12.981655, lon: 77.609414 }, // count=5, CBD 1
      { id: 'oldPoliceStation_Ashoknagar', name: 'OldPoliceStation-Ashoknagar', lat: 12.968371, lon: 77.606246 }, // count=5, Mysore Road
      { id: 'garebhavipalyaJunc', name: 'GarebhavipalyaJunc', lat: 12.893795, lon: 77.636908 }, // count=5, Hosur Road
      { id: 'a_S_CharStreet_MysoreRdJunc', name: 'A S CharStreet-MysoreRdJunc', lat: 12.964810, lon: 77.573895 }, // count=5, Mysore Road
      { id: '29thMainRdBTM_LayoutJunc', name: '29thMainRdBTM LayoutJunc', lat: 12.916210, lon: 77.616143 }, // count=5, Non-corridor
      { id: 'kamrajRdJunction', name: 'KamrajRdJunction', lat: 12.977098, lon: 77.608938 }, // count=5, Old Madras Road
      { id: 'mayohallJunction', name: 'MayohallJunction', lat: 12.973329, lon: 77.610614 }, // count=5, Old Madras Road
      { id: 'rajajinagarEntranceJunction', name: 'RajajinagarEntranceJunction', lat: 12.982258, lon: 77.559846 }, // count=5, Non-corridor
      { id: 'ashirwadamCircle', name: 'AshirwadamCircle', lat: 12.971060, lon: 77.604201 }, // count=5, Mysore Road
      { id: 'krupanidhi_College', name: 'Krupanidhi College', lat: 12.924667, lon: 77.627637 }, // count=5, Non-corridor
      { id: 'jaiMuniRaoCircle', name: 'JaiMuniRaoCircle', lat: 12.978470, lon: 77.543289 }, // count=5, Magadi Road
      { id: 'biryandCircle', name: 'BiryandCircle', lat: 12.964123, lon: 77.570038 }, // count=5, Mysore Road
      { id: 'dairyCircle', name: 'DairyCircle', lat: 12.936367, lon: 77.602909 }, // count=5, Bannerghata Road
      { id: 'hennurRd_DavisRdJunction', name: 'HennurRd-DavisRdJunction', lat: 13.003296, lon: 77.620410 }, // count=5, Airport New South Road
      { id: 'siddapuraJunction', name: 'SiddapuraJunction', lat: 12.949234, lon: 77.594827 }, // count=5, Non-corridor
      { id: 'devangaHostelJunction', name: 'DevangaHostelJunction', lat: 12.963188, lon: 77.588958 }, // count=5, Non-corridor
      { id: 'basaweshwaraCircle', name: 'BasaweshwaraCircle', lat: 12.984271, lon: 77.588602 }, // count=5, Bellary Road 1
      { id: 'sagarHospitalJunc', name: 'SagarHospitalJunc', lat: 12.927835, lon: 77.600373 }, // count=5, Bannerghata Road
      { id: 'cMH_Rd_AdarshTheaterJunc', name: 'CMH Rd-AdarshTheaterJunc', lat: 12.978332, lon: 77.628779 }, // count=5, Old Madras Road
      { id: 'jP_Nagar_9th_cross_24th_main_jn', name: 'JP Nagar 9th cross-24th main jn', lat: 12.911876, lon: 77.586113 }, // count=5, Non-corridor
      { id: 'd_SouzaCircle', name: 'D\'SouzaCircle', lat: 12.967161, lon: 77.610776 }, // count=4, Non-corridor
      { id: 'pES_DevegowdaCircle', name: 'PES-DevegowdaCircle', lat: 12.937722, lon: 77.533344 }, // count=4, ORR West 1
      { id: 'kammanahalli_RingRoadJunction', name: 'Kammanahalli-RingRoadJunction', lat: 13.026446, lon: 77.636777 }, // count=4, ORR North 1
      { id: 'jaipuria_Adugodi', name: 'Jaipuria-Adugodi', lat: 12.935063, lon: 77.624341 }, // count=4, IRR(Thanisandra road)
      { id: 'yemalur_cross_junc', name: 'Yemalur cross junc', lat: 12.956005, lon: 77.693498 }, // count=4, Old Airport Road
      { id: 'vetenaryHospitalJunc_Shivajinagar', name: 'VetenaryHospitalJunc-Shivajinagar', lat: 12.989637, lon: 77.599483 }, // count=4, Non-corridor
      { id: 'srinivagilu_Ejipura_Junc', name: 'Srinivagilu(Ejipura)Junc', lat: 12.938698, lon: 77.634254 }, // count=4, IRR(Thanisandra road)
      { id: 'navarangTheatreJunction', name: 'NavarangTheatreJunction', lat: 12.998121, lon: 77.552835 }, // count=4, West of Chord Road
      { id: 'begumMahalJunc', name: 'BegumMahalJunc', lat: 12.975720, lon: 77.620183 }, // count=4, Old Madras Road
      { id: 'tC_Palya_OM_RoadJunc', name: 'TC Palya-OM RoadJunc', lat: 13.017486, lon: 77.705930 }, // count=4, Non-corridor
      { id: 'bhashyamCircle_SadashivNagar', name: 'BhashyamCircle-SadashivNagar', lat: 13.007118, lon: 77.579463 }, // count=4, Non-corridor
      { id: 'mysoreRd_MadhuPetrolBunkJunction', name: 'MysoreRd--MadhuPetrolBunkJunction', lat: 12.912234, lon: 77.485364 }, // count=4, Mysore Road
      { id: 'cIL_CrossJunction_JayamahalRd', name: 'CIL CrossJunction-JayamahalRd', lat: 13.009079, lon: 77.591685 }, // count=4, Non-corridor
      { id: 'delmia_Jayanagar', name: 'Delmia-Jayanagar', lat: 12.906240, lon: 77.593901 }, // count=3, ORR West 1
      { id: 'modiBridgeJunction', name: 'ModiBridgeJunction', lat: 12.998804, lon: 77.549898 }, // count=3, West of Chord Road
      { id: 'webbsCircle', name: 'WebbsCircle', lat: 12.973986, lon: 77.613822 }, // count=3, Old Madras Road
      { id: 'nandiCross_RaniCross', name: 'NandiCross(RaniCross)', lat: 13.265405, lon: 77.718704 }, // count=3, Non-corridor
      { id: 'oldMadrasRd_SuddaguntepalyaRdJunc', name: 'OldMadrasRd-SuddaguntepalyaRdJunc', lat: 12.989704, lon: 77.653834 }, // count=3, Old Madras Road
      { id: '5thMainHSR', name: '5thMainHSR', lat: 12.916451, lon: 77.631317 }, // count=3, ORR East 1
      { id: 'linkRoadMalleswaramJunc', name: 'LinkRoadMalleswaramJunc', lat: 12.992857, lon: 77.574351 }, // count=3, Non-corridor
      { id: 'south_end_circle', name: 'South end circle', lat: 12.937704, lon: 77.579616 }, // count=3, Non-corridor
      { id: 'halliThindi', name: 'HalliThindi', lat: 12.943954, lon: 77.567902 }, // count=3, Non-corridor
      { id: 'doddaballapuraCrossJunc', name: 'DoddaballapuraCrossJunc', lat: 13.257249, lon: 77.712523 }, // count=3, Non-corridor
      { id: 'kuvempuCircle', name: 'KuvempuCircle', lat: 13.044634, lon: 77.562070 }, // count=3, ORR North 2
      { id: 'shankarMuttCircle', name: 'ShankarMuttCircle', lat: 12.999046, lon: 77.541334 }, // count=3, Non-corridor
      { id: 'bellandur_Junction_Outer_ring_road', name: 'Bellandur Junction, Outer ring road', lat: 12.926607, lon: 77.678337 }, // count=3, ORR East 1
      { id: 'lowerAgaram_IndiaGarage_Junc', name: 'LowerAgaram(IndiaGarage)Junc', lat: 12.964487, lon: 77.618107 }, // count=3, Non-corridor
      { id: 'oldMadrasRd_DoubleRdJunc', name: 'OldMadrasRd-DoubleRdJunc', lat: 12.982815, lon: 77.637507 }, // count=3, Old Madras Road
      { id: 'johnsonMarket', name: 'JohnsonMarket', lat: 12.962821, lon: 77.606613 }, // count=3, Hosur Road
      { id: 'hSR14thMainJunc', name: 'HSR14thMainJunc', lat: 12.918037, lon: 77.638771 }, // count=3, ORR East 1
      { id: 'shivanahalliJunctionWOC', name: 'ShivanahalliJunctionWOC', lat: 12.989829, lon: 77.550556 }, // count=3, West of Chord Road
      { id: 'narayanapura_cross_Hegde_nagar', name: 'Narayanapura cross, Hegde nagar', lat: 13.070610, lon: 77.634560 }, // count=3, Hennur Main Road
      { id: 'sonyworldJunction', name: 'SonyworldJunction', lat: 12.937406, lon: 77.627509 }, // count=3, IRR(Thanisandra road)
      { id: 'cashPharmacyJunction', name: 'CashPharmacyJunction', lat: 12.966028, lon: 77.599759 }, // count=3, Mysore Road
      { id: 'aSC_Junction', name: 'ASC Junction', lat: 12.966569, lon: 77.620548 }, // count=3, Non-corridor
      { id: 'gopalGowdaJUnc', name: 'GopalGowdaJUnc', lat: 12.978549, lon: 77.591190 }, // count=3, Non-corridor
      { id: 'anjaneyaTempleJunc', name: 'AnjaneyaTempleJunc', lat: 12.981287, lon: 77.630945 }, // count=3, Old Madras Road
      { id: 'basappa_Circle_Junction', name: 'Basappa Circle Junction', lat: 12.957187, lon: 77.576787 }, // count=3, Non-corridor
      { id: 'bM_ShriJunc_CMH_100FtRd_Junc', name: 'BM ShriJunc(CMH-100FtRd)Junc', lat: 12.978527, lon: 77.641304 }, // count=3, IRR(Thanisandra road)
      { id: 'bhashyamCircle', name: 'BhashyamCircle', lat: 12.985037, lon: 77.554348 }, // count=3, Non-corridor
      { id: 'j_D_MaraJunc', name: 'J D MaraJunc', lat: 12.907162, lon: 77.601056 }, // count=3, Bannerghata Road
      { id: '5thMainRPC_Layout_Vijayanagar', name: '5thMainRPC Layout-Vijayanagar', lat: 12.965781, lon: 77.535423 }, // count=3, West of Chord Road
      { id: 'hosmatJunction', name: 'HosmatJunction', lat: 12.968480, lon: 77.614423 }, // count=3, Non-corridor
      { id: 'bhadrappaLayout', name: 'BhadrappaLayout', lat: 13.046696, lon: 77.577351 }, // count=2, ORR North 2
      { id: 'bamboobazar_Shivajinagar', name: 'Bamboobazar(Shivajinagar)', lat: 12.993016, lon: 77.605161 }, // count=2, Non-corridor
      { id: 'bagalakunteCrossJunction', name: 'BagalakunteCrossJunction', lat: 13.059950, lon: 77.506856 }, // count=2, Non-corridor
      { id: 'navarangBarJunc_Dr_RajkumarRd', name: 'NavarangBarJunc-Dr RajkumarRd', lat: 12.987796, lon: 77.559790 }, // count=2, Non-corridor
      { id: 'trilight_Circle_Race_course_Road', name: 'Trilight Circle,Race course Road', lat: 12.984309, lon: 77.582697 }, // count=2, Non-corridor
      { id: 'nGV_RearGateJunc', name: 'NGV RearGateJunc', lat: 12.942458, lon: 77.622566 }, // count=2, Non-corridor
      { id: 'minerva_Circle', name: 'Minerva Circle', lat: 12.954954, lon: 77.580428 }, // count=2, Non-corridor
      { id: 'devanahalliCrossJunc', name: 'DevanahalliCrossJunc', lat: 13.241679, lon: 77.703565 }, // count=2, Non-corridor
      { id: 'chandraLayoutJunc_nearWaterTank', name: 'ChandraLayoutJunc-nearWaterTank', lat: 12.960020, lon: 77.527153 }, // count=2, Bellary Road 1
      { id: 'indiranasgar13thMainJunc', name: 'Indiranasgar13thMainJunc', lat: 12.966776, lon: 77.641549 }, // count=2, IRR(Thanisandra road)
      { id: 'uCO_Bank_Forum', name: 'UCO Bank(Forum)', lat: 12.933905, lon: 77.612605 }, // count=2, Hosur Road
      { id: 'adugodiJunc', name: 'AdugodiJunc', lat: 12.942810, lon: 77.607801 }, // count=2, Hosur Road
      { id: 'bEML_GateJunc_SuranjandasRd', name: 'BEML GateJunc(SuranjandasRd)', lat: 12.969254, lon: 77.658607 }, // count=2, Non-corridor
      { id: 'fire_Force_Junction', name: 'Fire Force Junction', lat: 12.980761, lon: 77.549505 }, // count=2, West of Chord Road
      { id: 'nTTF_JunctionPeenya', name: 'NTTF JunctionPeenya', lat: 13.024869, lon: 77.511133 }, // count=2, Non-corridor
      { id: 'peenya2ndStageBusStand', name: 'Peenya2ndStageBusStand', lat: 13.009777, lon: 77.505945 }, // count=2, Non-corridor
      { id: 'jayanagar_4th_main_36th_cross', name: 'Jayanagar 4th main,36th cross', lat: 12.922584, lon: 77.580317 }, // count=2, Non-corridor
      { id: 'swagathMainRd_EastEndRdJunc', name: 'SwagathMainRd-EastEndRdJunc', lat: 12.927278, lon: 77.597052 }, // count=2, Non-corridor
      { id: 'rajajinagagr1stBlockJunction', name: 'Rajajinagagr1stBlockJunction', lat: 13.004499, lon: 77.549460 }, // count=2, West of Chord Road
      { id: 'devegowdaPetrolBunkJunc', name: 'DevegowdaPetrolBunkJunc', lat: 12.920730, lon: 77.561262 }, // count=2, ORR West 1
      { id: 'basavamantapaJunc_Dr_RajkumarRd', name: 'BasavamantapaJunc-Dr RajkumarRd', lat: 12.980202, lon: 77.556189 }, // count=2, Non-corridor
      { id: 'chandrikaJunction', name: 'ChandrikaJunction', lat: 12.991385, lon: 77.592451 }, // count=2, Non-corridor
      { id: 'manipalCentreJunc', name: 'ManipalCentreJunc', lat: 12.975913, lon: 77.612987 }, // count=2, Old Madras Road
      { id: 'arts_CraftsCircle', name: 'Arts&CraftsCircle', lat: 12.975330, lon: 77.607326 }, // count=2, Old Madras Road
      { id: 'marenahalliRd_18thMainRdJunc', name: 'MarenahalliRd-18thMainRdJunc', lat: 12.918603, lon: 77.589154 }, // count=2, Non-corridor
      { id: 'cholurpalyaJunction_MagadiRd', name: 'CholurpalyaJunction(MagadiRd)', lat: 12.973764, lon: 77.550096 }, // count=2, West of Chord Road
      { id: 'kCG_HospitalJunction', name: 'KCG HospitalJunction', lat: 12.999318, lon: 77.571411 }, // count=2, Non-corridor
      { id: 'puttammaChoultryNagarbhavi', name: 'PuttammaChoultryNagarbhavi', lat: 12.975647, lon: 77.537915 }, // count=2, West of Chord Road
      { id: 'geethanjali_jn', name: 'Geethanjali jn', lat: 13.002918, lon: 77.571100 }, // count=2, Non-corridor
      { id: 'maharajaJunction', name: 'MaharajaJunction', lat: 12.934362, lon: 77.629695 }, // count=2, Non-corridor
      { id: 'upparpetJunction', name: 'UpparpetJunction', lat: 12.974313, lon: 77.574636 }, // count=2, Non-corridor
      { id: 'peenya14thCrossJunc', name: 'Peenya14thCrossJunc', lat: 13.016614, lon: 77.505446 }, // count=1, Non-corridor
      { id: 'vishweswaraiahJunctio_Uttamsagar', name: 'VishweswaraiahJunctio(Uttamsagar)', lat: 13.011368, lon: 77.646394 }, // count=1, Non-corridor
      { id: 'kR_Road_14thCross_Junc', name: 'KR Road-14thCross Junc', lat: 12.929715, lon: 77.573648 }, // count=1, Non-corridor
      { id: 'modiHospital', name: 'ModiHospital', lat: 12.997526, lon: 77.547038 }, // count=1, West of Chord Road
      { id: '27th_Cross_Jayanagar_Ganapathi_Temple', name: '27th Cross Jayanagar(Ganapathi Temple)', lat: 12.931752, lon: 77.579739 }, // count=1, Non-corridor
      { id: 'bHEL_Gate', name: 'BHEL Gate', lat: 12.846103, lon: 77.658927 }, // count=1, Non-corridor
      { id: 'gowdanapalyaJunction', name: 'GowdanapalyaJunction', lat: 12.913587, lon: 77.559025 }, // count=1, Non-corridor
      { id: 'tamarikannanJunc', name: 'TamarikannanJunc', lat: 12.981348, lon: 77.628571 }, // count=1, Old Madras Road
      { id: 'basveshwarnagar_8th_main_Junction', name: 'Basveshwarnagar 8th main Junction', lat: 12.992743, lon: 77.534145 }, // count=1, Non-corridor
      { id: 'kuvempuCircleJunc_HAL_MainGate', name: 'KuvempuCircleJunc,HAL MainGate', lat: 12.958055, lon: 77.668315 }, // count=1, Old Airport Road
      { id: 'kensingtonOvalJunc', name: 'KensingtonOvalJunc', lat: 12.982128, lon: 77.623603 }, // count=1, Non-corridor
      { id: 'attiguppeCircleJunction', name: 'AttiguppeCircleJunction', lat: 12.962130, lon: 77.533546 }, // count=1, West of Chord Road
      { id: 'gorappanapalyaJunction', name: 'GorappanapalyaJunction', lat: 12.920906, lon: 77.600266 }, // count=1, Bannerghata Road
      { id: 'nCERT_Junction', name: 'NCERT Junction', lat: 12.931896, lon: 77.544529 }, // count=1, ORR West 1
      { id: 'tVS_CrossJunction', name: 'TVS CrossJunction', lat: 13.028325, lon: 77.519157 }, // count=1, Non-corridor
      { id: 'govindapuraCross', name: 'GovindapuraCross', lat: 13.032092, lon: 77.621635 }, // count=1, Non-corridor
      { id: 'royanCircle_Chamrajpete', name: 'RoyanCircle-Chamrajpete', lat: 12.962489, lon: 77.565633 }, // count=1, Mysore Road
      { id: '17th_Mn_1st_Crs_Aishwarya_Stores_Jn', name: '17th Mn 1st Crs Aishwarya Stores Jn', lat: 12.925044, lon: 77.633626 }, // count=1, Non-corridor
      { id: 'wiproJunc_Koramangala', name: 'WiproJunc-Koramangala', lat: 12.929767, lon: 77.633090 }, // count=1, Non-corridor
      { id: 'dickensonRd_AdigasJunc', name: 'DickensonRd-AdigasJunc', lat: 12.979659, lon: 77.613821 }, // count=1, Non-corridor
      { id: 'oldMadrasRd_BMTC_DepotJunc', name: 'OldMadrasRd-BMTC DepotJunc', lat: 12.982556, lon: 77.635391 }, // count=1, Old Madras Road
      { id: 'colesParkJunc', name: 'ColesParkJunc', lat: 12.992824, lon: 77.609643 }, // count=1, Non-corridor
      { id: 'lalbaghWestGate', name: 'LalbaghWestGate', lat: 12.948353, lon: 77.579730 }, // count=1, Non-corridor
      { id: 'kamakyaJunction', name: 'KamakyaJunction', lat: 12.923394, lon: 77.554292 }, // count=1, ORR West 1
      { id: 'devanahalli_new_bus_stand', name: 'Devanahalli new bus stand', lat: 13.248356, lon: 77.715618 }, // count=1, Non-corridor
      { id: 'rajarajeshwariKalyanaMantapaJunc', name: 'RajarajeshwariKalyanaMantapaJunc', lat: 12.994492, lon: 77.554190 }, // count=1, West of Chord Road
      { id: 'nationalCollege', name: 'NationalCollege', lat: 12.951635, lon: 77.573620 }, // count=1, Non-corridor
      { id: 'dMRoadJunc_Basavangudi', name: 'DMRoadJunc(Basavangudi)', lat: 12.943615, lon: 77.572200 }, // count=1, Non-corridor
      { id: 'yediyurMeternityHospital', name: 'YediyurMeternityHospital', lat: 12.926708, lon: 77.577034 }, // count=1, Non-corridor
      { id: 'iSRO_Junction_NewBEL_Rd', name: 'ISRO Junction-NewBEL Rd', lat: 13.035118, lon: 77.567731 }, // count=1, Non-corridor
      { id: 'eSI_k_r_puram', name: 'ESI(k r puram)', lat: 12.993002, lon: 77.706351 }, // count=1, Non-corridor
      { id: 'kHB_Junction', name: 'KHB Junction', lat: 12.980763, lon: 77.536649 }, // count=1, Magadi Road
      { id: 'mSRamaiahHospitalJunc', name: 'MSRamaiahHospitalJunc', lat: 13.027881, lon: 77.574204 }, // count=1, Non-corridor
      { id: 'thomasCafe_New', name: 'ThomasCafe-New', lat: 12.990594, lon: 77.613855 }, // count=1, Non-corridor
      { id: 'k_G_Junction', name: 'K G Junction', lat: 12.975138, lon: 77.576476 }, // count=1, Non-corridor
      { id: 'geeta_Circle', name: 'Geeta Circle', lat: 12.928575, lon: 77.586116 }, // count=1, Non-corridor
      { id: 'brigadeMillenium', name: 'BrigadeMillenium', lat: 12.893377, lon: 77.585186 }, // count=1, Non-corridor
      { id: 'nagaTheaterJunc_Ulsoor', name: 'NagaTheaterJunc-Ulsoor', lat: 12.989753, lon: 77.618040 }, // count=1, Non-corridor
      { id: 'safinaPlazaJunc', name: 'SafinaPlazaJunc', lat: 12.980141, lon: 77.607412 }, // count=1, CBD 1
    ];

    junctions.forEach(j => this.junctions.set(j.id, j));
    console.log(`[GraphService] Loaded ${this.junctions.size} junctions.`);

    const addEdge = (source: string, target: string, corridor: string, prob: number) => {
      if (!this.adjacencyList.has(source)) this.adjacencyList.set(source, []);
      if (!this.adjacencyList.has(target)) this.adjacencyList.set(target, []);
      this.adjacencyList.get(source)!.push({ source, target, corridor, cascadeProbability: prob });
      this.adjacencyList.get(target)!.push({ source: target, target: source, corridor, cascadeProbability: prob });
    };

    // Corridor edges (data-driven, sorted N→S by latitude)
    // Airport New South Road
    addEdge('hennurRd_DavisRdJunction', 'hennurRoad_ORR_Junc', 'Airport New South Road', 0.75);
    // Bannerghata Road
    addEdge('meenakshiMallJunc', 'hulimaveRd_BanneraghattaRdJunc', 'Bannerghata Road', 0.75);
    addEdge('hulimaveRd_BanneraghattaRdJunc', 'arakereGateJunc', 'Bannerghata Road', 0.75);
    addEdge('arakereGateJunc', 'bilekahalliJunc', 'Bannerghata Road', 0.75);
    addEdge('bilekahalliJunc', 'j_D_MaraJunc', 'Bannerghata Road', 0.75);
    addEdge('j_D_MaraJunc', 'jayadevaHospitalJunc', 'Bannerghata Road', 0.75);
    addEdge('jayadevaHospitalJunc', '28thMainJayanagarJunc', 'Bannerghata Road', 0.75);
    addEdge('28thMainJayanagarJunc', 'gorappanapalyaJunction', 'Bannerghata Road', 0.75);
    addEdge('gorappanapalyaJunction', 'swagathMainRd_EastEndRdJunc', 'Bannerghata Road', 0.75);
    addEdge('swagathMainRd_EastEndRdJunc', 'sagarHospitalJunc', 'Bannerghata Road', 0.75);
    addEdge('sagarHospitalJunc', 'dairyCircle', 'Bannerghata Road', 0.75);
    // Bellary Road 1
    addEdge('chandraLayoutJunc_nearWaterTank', 'basaweshwaraCircle', 'Bellary Road 1', 0.75);
    addEdge('basaweshwaraCircle', 'lRDE_Junction', 'Bellary Road 1', 0.75);
    addEdge('lRDE_Junction', 'mekhriCircle', 'Bellary Road 1', 0.75);
    addEdge('mekhriCircle', 'yeshwanthpuraCircle', 'Bellary Road 1', 0.75);
    addEdge('yeshwanthpuraCircle', 'hebbalFlyoverJunc', 'Bellary Road 1', 0.75);
    addEdge('hebbalFlyoverJunc', 'kodigehalliCross', 'Bellary Road 1', 0.75);
    addEdge('kodigehalliCross', 'yelhankaCircle', 'Bellary Road 1', 0.75);
    // Bellary Road 2
    addEdge('yeshwanthpuraCircle', 'kodigehalliCross', 'Bellary Road 2', 0.75);
    addEdge('kodigehalliCross', 'batrayanapura_Amrutahalli_Junction', 'Bellary Road 2', 0.75);
    addEdge('batrayanapura_Amrutahalli_Junction', 'jakkurCrossJunction', 'Bellary Road 2', 0.75);
    addEdge('jakkurCrossJunction', 'yelhankaBypass', 'Bellary Road 2', 0.75);
    addEdge('yelhankaBypass', 'yelhankaCircle', 'Bellary Road 2', 0.75);
    addEdge('yelhankaCircle', 'santheCircle', 'Bellary Road 2', 0.75);
    addEdge('santheCircle', 'kogilluCrossJunc', 'Bellary Road 2', 0.75);
    addEdge('kogilluCrossJunc', 'bagalurCrossJunc', 'Bellary Road 2', 0.75);
    addEdge('bagalurCrossJunc', 'hunsemarammanahalliJunction', 'Bellary Road 2', 0.75);
    addEdge('hunsemarammanahalliJunction', 'sadahalliGateJunc_AirportRd', 'Bellary Road 2', 0.75);
    // CBD 1
    addEdge('shivajinagar_BRV_Junction', 'safinaPlazaJunc', 'CBD 1', 0.75);
    addEdge('safinaPlazaJunc', 'tyagiHengalvarayaJunc_DickensonRd', 'CBD 1', 0.75);
    // CBD 2
    addEdge('queensStatueCircle', 'minskSquare_CTO_Junction', 'CBD 2', 0.75);
    addEdge('minskSquare_CTO_Junction', 'policeTimmaiahCircle_GPO', 'CBD 2', 0.75);
    addEdge('policeTimmaiahCircle_GPO', 'coffeeBoardJunc', 'CBD 2', 0.75);
    addEdge('coffeeBoardJunc', 'indianExpressJunction', 'CBD 2', 0.75);
    addEdge('indianExpressJunction', 'yeshwanthpuraCircle', 'CBD 2', 0.75);
    // Hennur Main Road
    addEdge('nagavara_ORR_Junction', 'narayanapura_cross_Hegde_nagar', 'Hennur Main Road', 0.75);
    // Hosur Road
    addEdge('naganathapuraJunction', 'kudlu_Gate_Junc', 'Hosur Road', 0.75);
    addEdge('kudlu_Gate_Junc', 'garebhavipalyaJunc', 'Hosur Road', 0.75);
    addEdge('garebhavipalyaJunc', 'bommanahalli', 'Hosur Road', 0.75);
    addEdge('bommanahalli', 'silkBoardJunc', 'Hosur Road', 0.75);
    addEdge('silkBoardJunc', 'ayyappaTempleJunc', 'Hosur Road', 0.75);
    addEdge('ayyappaTempleJunc', 'sarjapurRd_St_JohnsRdJunc', 'Hosur Road', 0.75);
    addEdge('sarjapurRd_St_JohnsRdJunc', 'uCO_Bank_Forum', 'Hosur Road', 0.75);
    addEdge('uCO_Bank_Forum', 'marigowda_TavarkereRdJunc', 'Hosur Road', 0.75);
    addEdge('marigowda_TavarkereRdJunc', 'adugodiJunc', 'Hosur Road', 0.75);
    addEdge('adugodiJunc', 'anepalyaJunc', 'Hosur Road', 0.75);
    addEdge('anepalyaJunc', 'cMP_GateJunc', 'Hosur Road', 0.75);
    addEdge('cMP_GateJunc', 'johnsonMarket', 'Hosur Road', 0.75);
    // IRR(Thanisandra road)
    addEdge('ayyappaTempleJunc', 'koramangalaWaterTankJunc', 'IRR(Thanisandra road)', 0.75);
    addEdge('koramangalaWaterTankJunc', 'bDA_Junctio_Koramangala', 'IRR(Thanisandra road)', 0.75);
    addEdge('bDA_Junctio_Koramangala', 'jaipuria_Adugodi', 'IRR(Thanisandra road)', 0.75);
    addEdge('jaipuria_Adugodi', 'sonyworldJunction', 'IRR(Thanisandra road)', 0.75);
    addEdge('sonyworldJunction', 'srinivagilu_Ejipura_Junc', 'IRR(Thanisandra road)', 0.75);
    addEdge('srinivagilu_Ejipura_Junc', 'indiranasgar13thMainJunc', 'IRR(Thanisandra road)', 0.75);
    addEdge('indiranasgar13thMainJunc', 'bM_ShriJunc_CMH_100FtRd_Junc', 'IRR(Thanisandra road)', 0.75);
    // Magadi Road
    addEdge('leprosyhospitalJunc', 'prasannaJunction', 'Magadi Road', 0.75);
    addEdge('prasannaJunction', 'jaiMuniRaoCircle', 'Magadi Road', 0.75);
    addEdge('jaiMuniRaoCircle', 'kHB_Junction', 'Magadi Road', 0.75);
    addEdge('kHB_Junction', 'sumanhalli', 'Magadi Road', 0.75);
    addEdge('sumanhalli', 'srigandakaval', 'Magadi Road', 0.75);
    addEdge('srigandakaval', 'yeshwanthpuraCircle', 'Magadi Road', 0.75);
    // Mysore Road
    addEdge('mysoreRd_MadhuPetrolBunkJunction', 'universityJunc_Janabharti', 'Mysore Road', 0.75);
    addEdge('universityJunc_Janabharti', 'rajeshwariJunc', 'Mysore Road', 0.75);
    addEdge('rajeshwariJunc', 'mysoreRd_RingRdJunc_Nayandanahallii', 'Mysore Road', 0.75);
    addEdge('mysoreRd_RingRdJunc_Nayandanahallii', 'kIMCO_Junction', 'Mysore Road', 0.75);
    addEdge('kIMCO_Junction', 'satteliteBusStandJunc', 'Mysore Road', 0.75);
    addEdge('satteliteBusStandJunc', 'toll_gate_mysore_road', 'Mysore Road', 0.75);
    addEdge('toll_gate_mysore_road', 'bangaloreBodyBuildersJunc', 'Mysore Road', 0.75);
    addEdge('bangaloreBodyBuildersJunc', 'sirsiCircle', 'Mysore Road', 0.75);
    addEdge('sirsiCircle', 'bloodBankCircle', 'Mysore Road', 0.75);
    addEdge('bloodBankCircle', 'royanCircle_Chamrajpete', 'Mysore Road', 0.75);
    addEdge('royanCircle_Chamrajpete', 'shivajiTalkiesJunc', 'Mysore Road', 0.75);
    addEdge('shivajiTalkiesJunc', 'johnsonMarket', 'Mysore Road', 0.75);
    addEdge('johnsonMarket', 'devangaHostelJunction', 'Mysore Road', 0.75);
    addEdge('devangaHostelJunction', 'k_R_MarketJunction', 'Mysore Road', 0.75);
    addEdge('k_R_MarketJunction', 'townhallJunction', 'Mysore Road', 0.75);
    addEdge('townhallJunction', 'biryandCircle', 'Mysore Road', 0.75);
    addEdge('biryandCircle', 'a_S_CharStreet_MysoreRdJunc', 'Mysore Road', 0.75);
    addEdge('a_S_CharStreet_MysoreRdJunc', 'richmond_circle_jn', 'Mysore Road', 0.75);
    addEdge('richmond_circle_jn', 'dr_TCM_RoyanRd_near_AmbedkarStatue', 'Mysore Road', 0.75);
    addEdge('dr_TCM_RoyanRd_near_AmbedkarStatue', 'n_R_SquareJunc', 'Mysore Road', 0.75);
    addEdge('n_R_SquareJunc', 'cashPharmacyJunction', 'Mysore Road', 0.75);
    addEdge('cashPharmacyJunction', 'ashoknagar_Junction_ShoolayCircle', 'Mysore Road', 0.75);
    addEdge('ashoknagar_Junction_ShoolayCircle', 'motherTeressaCircle', 'Mysore Road', 0.75);
    addEdge('motherTeressaCircle', 'ulsoorGateJunc', 'Mysore Road', 0.75);
    addEdge('ulsoorGateJunc', 'hudsonCircle', 'Mysore Road', 0.75);
    addEdge('hudsonCircle', 'oldPoliceStation_Ashoknagar', 'Mysore Road', 0.75);
    addEdge('oldPoliceStation_Ashoknagar', 'policeCornerJunc', 'Mysore Road', 0.75);
    addEdge('policeCornerJunc', 'ashirwadamCircle', 'Mysore Road', 0.75);
    addEdge('ashirwadamCircle', 'siddalingaiahCircle', 'Mysore Road', 0.75);
    addEdge('siddalingaiahCircle', 'operaHouseJunc', 'Mysore Road', 0.75);
    // ORR East 1
    addEdge('5thMainHSR', 'silkBoardJunc', 'ORR East 1', 0.75);
    addEdge('silkBoardJunc', 'hSR14thMainJunc', 'ORR East 1', 0.75);
    addEdge('hSR14thMainJunc', 'ibblurJunction', 'ORR East 1', 0.75);
    addEdge('ibblurJunction', 'agaraJunction', 'ORR East 1', 0.75);
    addEdge('agaraJunction', 'bellandur_Junction_Outer_ring_road', 'ORR East 1', 0.75);
    addEdge('bellandur_Junction_Outer_ring_road', 'deverabeesanahalli_ORR_Junc', 'ORR East 1', 0.75);
    addEdge('deverabeesanahalli_ORR_Junc', 'kadubeesanahalli_ORR_Junc', 'ORR East 1', 0.75);
    addEdge('kadubeesanahalli_ORR_Junc', 'maratahalliBridgeJunc', 'ORR East 1', 0.75);
    // ORR North 1
    addEdge('ramamurthyNagarJunction', 'yeshwanthpuraCircle', 'ORR North 1', 0.75);
    addEdge('yeshwanthpuraCircle', 'horamavuJunction', 'ORR North 1', 0.75);
    addEdge('horamavuJunction', 'kalyanNagar_ORR_Junc', 'ORR North 1', 0.75);
    addEdge('kalyanNagar_ORR_Junc', 'kammanahalli_RingRoadJunction', 'ORR North 1', 0.75);
    addEdge('kammanahalli_RingRoadJunction', 'hennurRoad_ORR_Junc', 'ORR North 1', 0.75);
    addEdge('hennurRoad_ORR_Junc', 'nagavara_ORR_Junction', 'ORR North 1', 0.75);
    addEdge('nagavara_ORR_Junction', 'veerannapalyaJunction_BEL_HO', 'ORR North 1', 0.75);
    addEdge('veerannapalyaJunction_BEL_HO', 'hebbalFlyoverJunc', 'ORR North 1', 0.75);
    // ORR North 2
    addEdge('goruguntepalyaJunc', 'bEL_Circle', 'ORR North 2', 0.75);
    addEdge('bEL_Circle', 'kuvempuCircle', 'ORR North 2', 0.75);
    addEdge('kuvempuCircle', 'bhadrappaLayout', 'ORR North 2', 0.75);
    // ORR West 1
    addEdge('kanakapuraRd_RingRdJunction', 'jP_Nagar_15th_cross_junction', 'ORR West 1', 0.75);
    addEdge('jP_Nagar_15th_cross_junction', 'delmia_Jayanagar', 'ORR West 1', 0.75);
    addEdge('delmia_Jayanagar', 'kadirenahalliJunction', 'ORR West 1', 0.75);
    addEdge('kadirenahalliJunction', 'devegowdaPetrolBunkJunc', 'ORR West 1', 0.75);
    addEdge('devegowdaPetrolBunkJunc', 'kamakyaJunction', 'ORR West 1', 0.75);
    addEdge('kamakyaJunction', 'katriguppeJunction', 'ORR West 1', 0.75);
    addEdge('katriguppeJunction', 'itmaduJunction', 'ORR West 1', 0.75);
    addEdge('itmaduJunction', 'nCERT_Junction', 'ORR West 1', 0.75);
    addEdge('nCERT_Junction', 'pES_DevegowdaCircle', 'ORR West 1', 0.75);
    addEdge('pES_DevegowdaCircle', 'mysoreRd_RingRdJunc_Nayandanahallii', 'ORR West 1', 0.75);
    // Old Airport Road
    addEdge('yemalur_cross_junc', 'maratahalliBridgeJunc', 'Old Airport Road', 0.75);
    addEdge('maratahalliBridgeJunc', 'kuvempuCircleJunc_HAL_MainGate', 'Old Airport Road', 0.75);
    addEdge('kuvempuCircleJunc_HAL_MainGate', 'iSRO_Junction_Airport_rd', 'Old Airport Road', 0.75);
    addEdge('iSRO_Junction_Airport_rd', 'domlurWaterTank', 'Old Airport Road', 0.75);
    // Old Madras Road
    addEdge('trinityCircle', 'operaHouseJunc', 'Old Madras Road', 0.75);
    addEdge('operaHouseJunc', 'mayohallJunction', 'Old Madras Road', 0.75);
    addEdge('mayohallJunction', 'webbsCircle', 'Old Madras Road', 0.75);
    addEdge('webbsCircle', 'arts_CraftsCircle', 'Old Madras Road', 0.75);
    addEdge('arts_CraftsCircle', 'ramaiahCircle_UlsoorPoliceStation', 'Old Madras Road', 0.75);
    addEdge('ramaiahCircle_UlsoorPoliceStation', 'begumMahalJunc', 'Old Madras Road', 0.75);
    addEdge('begumMahalJunc', 'manipalCentreJunc', 'Old Madras Road', 0.75);
    addEdge('manipalCentreJunc', 'anilKumbleCircle', 'Old Madras Road', 0.75);
    addEdge('anilKumbleCircle', 'kamrajRdJunction', 'Old Madras Road', 0.75);
    addEdge('kamrajRdJunction', 'queensStatueCircle', 'Old Madras Road', 0.75);
    addEdge('queensStatueCircle', 'cMH_Rd_AdarshTheaterJunc', 'Old Madras Road', 0.75);
    addEdge('cMH_Rd_AdarshTheaterJunc', 'shivajinagar_BRV_Junction', 'Old Madras Road', 0.75);
    addEdge('shivajinagar_BRV_Junction', 'anjaneyaTempleJunc', 'Old Madras Road', 0.75);
    addEdge('anjaneyaTempleJunc', 'tamarikannanJunc', 'Old Madras Road', 0.75);
    addEdge('tamarikannanJunc', 'oldMadrasRd_BMTC_DepotJunc', 'Old Madras Road', 0.75);
    addEdge('oldMadrasRd_BMTC_DepotJunc', 'oldMadrasRd_DoubleRdJunc', 'Old Madras Road', 0.75);
    addEdge('oldMadrasRd_DoubleRdJunc', 'oldMadrasRd_Indranagar100ftRdJunc', 'Old Madras Road', 0.75);
    addEdge('oldMadrasRd_Indranagar100ftRdJunc', 'oldMadrasRd_80FeetRdJunc', 'Old Madras Road', 0.75);
    addEdge('oldMadrasRd_80FeetRdJunc', 'oldMadrasRd_NGEF_Junc', 'Old Madras Road', 0.75);
    addEdge('oldMadrasRd_NGEF_Junc', 'oldMadrasRd_SuddaguntepalyaRdJunc', 'Old Madras Road', 0.75);
    addEdge('oldMadrasRd_SuddaguntepalyaRdJunc', 'bigBazaarJunction_OldMadrasRd', 'Old Madras Road', 0.75);
    // Tumkur Road
    addEdge('tataInstituteCircle', 'mS_RamaiahJunc_TollGate', 'Tumkur Road', 0.75);
    addEdge('mS_RamaiahJunc_TollGate', 'yeshwanthpuraCircle', 'Tumkur Road', 0.75);
    addEdge('yeshwanthpuraCircle', 'tumkurRdMarappanapalyaJunc', 'Tumkur Road', 0.75);
    addEdge('tumkurRdMarappanapalyaJunc', 'goruguntepalyaJunc', 'Tumkur Road', 0.75);
    addEdge('goruguntepalyaJunc', 'gokuldasImagesJunc', 'Tumkur Road', 0.75);
    addEdge('gokuldasImagesJunc', 'sRS_Peenya_Junc', 'Tumkur Road', 0.75);
    addEdge('sRS_Peenya_Junc', 'peenyaPoliceStation', 'Tumkur Road', 0.75);
    addEdge('peenyaPoliceStation', 'jalahalliCross_SM_Circle', 'Tumkur Road', 0.75);
    addEdge('jalahalliCross_SM_Circle', 'chokasandra_Tumkur_road', 'Tumkur Road', 0.75);
    addEdge('chokasandra_Tumkur_road', 'hesaraghattaJunction', 'Tumkur Road', 0.75);
    // Varthur Road
    addEdge('kundanahalliGateJunc', 'maratahalliBridgeJunc', 'Varthur Road', 0.75);
    // West of Chord Road
    addEdge('kIMCO_Junction', 'chandraLayoutJunc_nearWaterTank', 'West of Chord Road', 0.75);
    addEdge('chandraLayoutJunc_nearWaterTank', 'attiguppeCircleJunction', 'West of Chord Road', 0.75);
    addEdge('attiguppeCircleJunction', '5thMainRPC_Layout_Vijayanagar', 'West of Chord Road', 0.75);
    addEdge('5thMainRPC_Layout_Vijayanagar', 'vijayanagarBusStandJunction', 'West of Chord Road', 0.75);
    addEdge('vijayanagarBusStandJunction', 'cholurpalyaJunction_MagadiRd', 'West of Chord Road', 0.75);
    addEdge('cholurpalyaJunction_MagadiRd', 'puttammaChoultryNagarbhavi', 'West of Chord Road', 0.75);
    addEdge('puttammaChoultryNagarbhavi', 'mC_Circle', 'West of Chord Road', 0.75);
    addEdge('mC_Circle', 'fire_Force_Junction', 'West of Chord Road', 0.75);
    addEdge('fire_Force_Junction', 'bhashyamCircle', 'West of Chord Road', 0.75);
    addEdge('bhashyamCircle', 'dhobiGhatJunc', 'West of Chord Road', 0.75);
    addEdge('dhobiGhatJunc', 'shivanahalliJunctionWOC', 'West of Chord Road', 0.75);
    addEdge('shivanahalliJunctionWOC', 'rajarajeshwariKalyanaMantapaJunc', 'West of Chord Road', 0.75);
    addEdge('rajarajeshwariKalyanaMantapaJunc', 'modiHospital', 'West of Chord Road', 0.75);
    addEdge('modiHospital', 'rajajinagar19thMainJunc', 'West of Chord Road', 0.75);
    addEdge('rajajinagar19thMainJunc', 'navarangTheatreJunction', 'West of Chord Road', 0.75);
    addEdge('navarangTheatreJunction', 'modiBridgeJunction', 'West of Chord Road', 0.75);
    addEdge('modiBridgeJunction', 'rajajinagagr1stBlockJunction', 'West of Chord Road', 0.75);
    addEdge('rajajinagagr1stBlockJunction', 'dr_RajkumarRd_10thCrossRdJunc', 'West of Chord Road', 0.75);
    addEdge('dr_RajkumarRd_10thCrossRdJunc', 'mahalaxmiLayoutEntranceJunc', 'West of Chord Road', 0.75);
    addEdge('mahalaxmiLayoutEntranceJunc', 'tumkurRdMarappanapalyaJunc', 'West of Chord Road', 0.75);

    console.log(`[GraphService] Loaded ${this.adjacencyList.size} nodes with edges. Total corridors: 176 edges.`);
  }

  public getNearestJunction(lat: number, lon: number): Junction | null {
    let nearest: Junction | null = null;
    let minDistance = Infinity;
    for (const junction of this.junctions.values()) {
      const dist = Math.sqrt(Math.pow(junction.lat - lat, 2) + Math.pow(junction.lon - lon, 2));
      if (dist < minDistance) { minDistance = dist; nearest = junction; }
    }
    console.log(`[GraphService] getNearestJunction(${lat}, ${lon}) → ${nearest?.id ?? 'null'} (dist=${minDistance.toFixed(6)})`);
    return nearest;
  }

  public getNeighbors(nodeId: string): Edge[] {
    return this.adjacencyList.get(nodeId) || [];
  }
}

export const graphService = new GraphService();
