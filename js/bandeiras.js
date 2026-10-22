// Mister 26 — códigos de países (FIFA, como na Wikipédia) -> nome em português e bandeira (emoji).
(function () {
  // código: [ISO 3166-1 alfa-2, nome]
  const T = {
    AFG: ['AF', 'Afeganistão'], ALB: ['AL', 'Albânia'], ALG: ['DZ', 'Argélia'], AND: ['AD', 'Andorra'], ANG: ['AO', 'Angola'],
    ARG: ['AR', 'Argentina'], ARM: ['AM', 'Arménia'], ARU: ['AW', 'Aruba'], AUS: ['AU', 'Austrália'], AUT: ['AT', 'Áustria'],
    AZE: ['AZ', 'Azerbaijão'], BAH: ['BS', 'Baamas'], BHR: ['BH', 'Barém'], BAN: ['BD', 'Bangladesh'], BRB: ['BB', 'Barbados'],
    BLR: ['BY', 'Bielorrússia'], BEL: ['BE', 'Bélgica'], BLZ: ['BZ', 'Belize'], BEN: ['BJ', 'Benim'], BER: ['BM', 'Bermudas'],
    BOL: ['BO', 'Bolívia'], BIH: ['BA', 'Bósnia e Herzegovina'], BOT: ['BW', 'Botsuana'], BRA: ['BR', 'Brasil'], BUL: ['BG', 'Bulgária'],
    BFA: ['BF', 'Burquina Faso'], BDI: ['BI', 'Burundi'], CAM: ['KH', 'Camboja'], CMR: ['CM', 'Camarões'], CAN: ['CA', 'Canadá'],
    CPV: ['CV', 'Cabo Verde'], CTA: ['CF', 'Rep. Centro-Africana'], CHA: ['TD', 'Chade'], CHI: ['CL', 'Chile'], CHN: ['CN', 'China'],
    COL: ['CO', 'Colômbia'], COM: ['KM', 'Comores'], CGO: ['CG', 'Congo'], COD: ['CD', 'RD Congo'], CRC: ['CR', 'Costa Rica'],
    CIV: ['CI', 'Costa do Marfim'], CRO: ['HR', 'Croácia'], CUB: ['CU', 'Cuba'], CUW: ['CW', 'Curaçau'], CYP: ['CY', 'Chipre'],
    CZE: ['CZ', 'Chéquia'], DEN: ['DK', 'Dinamarca'], DJI: ['DJ', 'Djibuti'], DOM: ['DO', 'Rep. Dominicana'], ECU: ['EC', 'Equador'],
    EGY: ['EG', 'Egito'], SLV: ['SV', 'El Salvador'], ENG: ['GB-ENG', 'Inglaterra'], EQG: ['GQ', 'Guiné Equatorial'], ERI: ['ER', 'Eritreia'],
    EST: ['EE', 'Estónia'], ETH: ['ET', 'Etiópia'], FRO: ['FO', 'Ilhas Faroé'], FIJ: ['FJ', 'Fiji'], FIN: ['FI', 'Finlândia'],
    FRA: ['FR', 'França'], GAB: ['GA', 'Gabão'], GAM: ['GM', 'Gâmbia'], GEO: ['GE', 'Geórgia'], GER: ['DE', 'Alemanha'],
    GHA: ['GH', 'Gana'], GIB: ['GI', 'Gibraltar'], GRE: ['GR', 'Grécia'], GUA: ['GT', 'Guatemala'], GUI: ['GN', 'Guiné'],
    GNB: ['GW', 'Guiné-Bissau'], GBS: ['GW', 'Guiné-Bissau'], GUY: ['GY', 'Guiana'], HAI: ['HT', 'Haiti'], HON: ['HN', 'Honduras'],
    HKG: ['HK', 'Hong Kong'], HUN: ['HU', 'Hungria'], ISL: ['IS', 'Islândia'], IND: ['IN', 'Índia'], IDN: ['ID', 'Indonésia'],
    IRN: ['IR', 'Irão'], IRQ: ['IQ', 'Iraque'], IRL: ['IE', 'Irlanda'], ISR: ['IL', 'Israel'], ITA: ['IT', 'Itália'],
    JAM: ['JM', 'Jamaica'], JPN: ['JP', 'Japão'], JOR: ['JO', 'Jordânia'], KAZ: ['KZ', 'Cazaquistão'], KEN: ['KE', 'Quénia'],
    KOR: ['KR', 'Coreia do Sul'], PRK: ['KP', 'Coreia do Norte'], KVX: ['XK', 'Kosovo'], KUW: ['KW', 'Kuwait'], KGZ: ['KG', 'Quirguistão'],
    LAO: ['LA', 'Laos'], LVA: ['LV', 'Letónia'], LBN: ['LB', 'Líbano'], LES: ['LS', 'Lesoto'], LBR: ['LR', 'Libéria'],
    LBY: ['LY', 'Líbia'], LIE: ['LI', 'Listenstaine'], LTU: ['LT', 'Lituânia'], LUX: ['LU', 'Luxemburgo'], MAC: ['MO', 'Macau'],
    MAD: ['MG', 'Madagáscar'], MWI: ['MW', 'Maláui'], MAS: ['MY', 'Malásia'], MDV: ['MV', 'Maldivas'], MLI: ['ML', 'Mali'],
    MLT: ['MT', 'Malta'], MTN: ['MR', 'Mauritânia'], MRI: ['MU', 'Maurícia'], MEX: ['MX', 'México'], MDA: ['MD', 'Moldávia'],
    MNE: ['ME', 'Montenegro'], MAR: ['MA', 'Marrocos'], MOZ: ['MZ', 'Moçambique'], MYA: ['MM', 'Mianmar'], NAM: ['NA', 'Namíbia'],
    NEP: ['NP', 'Nepal'], NED: ['NL', 'Países Baixos'], NCL: ['NC', 'Nova Caledónia'], NZL: ['NZ', 'Nova Zelândia'], NCA: ['NI', 'Nicarágua'],
    NIG: ['NE', 'Níger'], NGA: ['NG', 'Nigéria'], NIR: ['GB-NIR', 'Irlanda do Norte'], MKD: ['MK', 'Macedónia do Norte'], NOR: ['NO', 'Noruega'],
    OMA: ['OM', 'Omã'], PAK: ['PK', 'Paquistão'], PLE: ['PS', 'Palestina'], PAN: ['PA', 'Panamá'], PNG: ['PG', 'Papua-Nova Guiné'],
    PAR: ['PY', 'Paraguai'], PER: ['PE', 'Peru'], PHI: ['PH', 'Filipinas'], POL: ['PL', 'Polónia'], POR: ['PT', 'Portugal'],
    PUR: ['PR', 'Porto Rico'], QAT: ['QA', 'Catar'], ROU: ['RO', 'Roménia'], RUS: ['RU', 'Rússia'], RWA: ['RW', 'Ruanda'],
    SMR: ['SM', 'São Marinho'], STP: ['ST', 'São Tomé e Príncipe'], KSA: ['SA', 'Arábia Saudita'], SCO: ['GB-SCT', 'Escócia'], SEN: ['SN', 'Senegal'],
    SRB: ['RS', 'Sérvia'], SEY: ['SC', 'Seicheles'], SLE: ['SL', 'Serra Leoa'], SIN: ['SG', 'Singapura'], SVK: ['SK', 'Eslováquia'],
    SVN: ['SI', 'Eslovénia'], SOM: ['SO', 'Somália'], RSA: ['ZA', 'África do Sul'], ESP: ['ES', 'Espanha'], SRI: ['LK', 'Sri Lanca'],
    SUD: ['SD', 'Sudão'], SSD: ['SS', 'Sudão do Sul'], SUR: ['SR', 'Suriname'], SWE: ['SE', 'Suécia'], SUI: ['CH', 'Suíça'],
    SYR: ['SY', 'Síria'], TAH: ['PF', 'Taiti'], TPE: ['TW', 'Taiwan'], TJK: ['TJ', 'Tajiquistão'], TAN: ['TZ', 'Tanzânia'],
    THA: ['TH', 'Tailândia'], TLS: ['TL', 'Timor-Leste'], TOG: ['TG', 'Togo'], TRI: ['TT', 'Trindade e Tobago'], TUN: ['TN', 'Tunísia'],
    TUR: ['TR', 'Turquia'], TKM: ['TM', 'Turquemenistão'], UGA: ['UG', 'Uganda'], UKR: ['UA', 'Ucrânia'], UAE: ['AE', 'Emirados Árabes Unidos'],
    USA: ['US', 'Estados Unidos'], URU: ['UY', 'Uruguai'], UZB: ['UZ', 'Usbequistão'], VEN: ['VE', 'Venezuela'], VIE: ['VN', 'Vietname'],
    WAL: ['GB-WLS', 'País de Gales'], YEM: ['YE', 'Iémen'], ZAM: ['ZM', 'Zâmbia'], ZIM: ['ZW', 'Zimbabué'], SKN: ['KN', 'São Cristóvão e Neves'],
    GUM: ['GU', 'Guam'], GLP: ['GP', 'Guadalupe'], MTQ: ['MQ', 'Martinica'], GUF: ['GF', 'Guiana Francesa'], REU: ['RE', 'Reunião'],
    CAY: ['KY', 'Ilhas Caimão'], ATG: ['AG', 'Antígua e Barbuda'], VIN: ['VC', 'São Vicente e Granadinas'], LCA: ['LC', 'Santa Lúcia'], GRN: ['GD', 'Granada'],
    DMA: ['DM', 'Domínica'], BRU: ['BN', 'Brunei'], BHU: ['BT', 'Butão'], MGL: ['MN', 'Mongólia'], SWZ: ['SZ', 'Essuatíni'],
    COK: ['CK', 'Ilhas Cook'], SAM: ['WS', 'Samoa'], SOL: ['SB', 'Ilhas Salomão'], TGA: ['TO', 'Tonga'], VAN: ['VU', 'Vanuatu'],
    ASA: ['AS', 'Samoa Americana'], MSR: ['MS', 'Monserrate'], VGB: ['VG', 'Ilhas Virgens Britânicas'], VIR: ['VI', 'Ilhas Virgens Americanas'], TCA: ['TC', 'Turcas e Caicos'],
    AIA: ['AI', 'Anguila'], BOE: ['BQ', 'Bonaire'], SMN: ['MF', 'São Martinho'], SXM: ['SX', 'Sint Maarten'], NMI: ['MP', 'Marianas do Norte'],
  };

  function emoji(iso) {
    if (!iso) return '🏳️';
    if (iso.startsWith('GB-')) {
      const sub = iso.slice(3).toLowerCase();
      const tags = ('gb' + sub).split('').map(c => String.fromCodePoint(0xE0000 + c.charCodeAt(0))).join('');
      return '🏴' + tags + '\u{E007F}';
    }
    return [...iso].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
  }

  window.Bandeiras = {
    nome: cod => (T[cod] || [null, cod])[1],
    emoji: cod => emoji((T[cod] || [])[0]),
    existe: cod => !!T[cod],
    todas: () => Object.keys(T),
  };
})();
