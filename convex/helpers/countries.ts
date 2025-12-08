import * as Flags from 'country-flag-icons/react/3x2';
import type { FlagComponent } from 'country-flag-icons/react/3x2';

export interface Country {
    code: string;
    name: string;
    flag: FlagComponent;
}

export const countries: Record<string, Country> = {
    NOR: {
        code: 'NOR',
        name: 'Norway',
        flag: Flags.NO,
    },
    SWE: {
        code: 'SWE',
        name: 'Sweden',
        flag: Flags.SE,
    },
    SUI: {
        code: 'SUI',
        name: 'Switzerland',
        flag: Flags.CH,
    },
    FIN: {
        code: 'FIN',
        name: 'Finland',
        flag: Flags.FI,
    },
    AUT: {
        code: 'AUT',
        name: 'Austria',
        flag: Flags.AT,
    },
    FRA: {
        code: 'FRA',
        name: 'France',
        flag: Flags.FR,
    },
    EST: {
        code: 'EST',
        name: 'Estonia',
        flag: Flags.EE,
    },
    DEN: {
        code: 'DEN',
        name: 'Denmark',
        flag: Flags.DK,
    },
    CAN: {
        code: 'CAN',
        name: 'Canada',
        flag: Flags.CA,
    },
    BUL: {
        code: 'BUL',
        name: 'Bulgaria',
        flag: Flags.BG,
    },
    BEL: {
        code: 'BEL',
        name: 'Belgium',
        flag: Flags.BE,
    },
    NZL: {
        code: 'NZL',
        name: 'New Zealand',
        flag: Flags.NZ,
    },
    LAT: {
        code: 'LAT',
        name: 'Latvia',
        flag: Flags.LV,
    },
    GER: {
        code: 'GER',
        name: 'Germany',
        flag: Flags.DE,
    },
    SVK: {
        code: 'SVK',
        name: 'Slovakia',
        flag: Flags.SK,
    },
    GBR: {
        code: 'GBR',
        name: 'Great Britain',
        flag: Flags.GB,
    },
    POL: {
        code: 'POL',
        name: 'Poland',
        flag: Flags.PL,
    },
    ITA: {
        code: 'ITA',
        name: 'Italy',
        flag: Flags.IT,
    },
    CZE: {
        code: 'CZE',
        name: 'Czech Republic',
        flag: Flags.CZ,
    },
    NED: {
        code: 'NED',
        name: 'Netherlands',
        flag: Flags.NL,
    },
    HUN: {
        code: 'HUN',
        name: 'Hungary',
        flag: Flags.HU,
    },
    AUS: {
        code: 'AUS',
        name: 'Australia',
        flag: Flags.AU,
    },
    USA: {
        code: 'USA',
        name: 'United States',
        flag: Flags.US,
    },
    LTU: {
        code: 'LTU',
        name: 'Lithuania',
        flag: Flags.LT,
    },
    ISR: {
        code: 'ISR',
        name: 'Israel',
        flag: Flags.IL,
    },
    POR: {
        code: 'POR',
        name: 'Portugal',
        flag: Flags.PT,
    },
    CRO: {
        code: 'CRO',
        name: 'Croatia',
        flag: Flags.HR,
    },
    IRL: {
        code: 'IRL',
        name: 'Ireland',
        flag: Flags.IE,
    },
    JPN: {
        code: 'JPN',
        name: 'Japan',
        flag: Flags.JP,
    },
    ROU: {
        code: 'ROU',
        name: 'Romania',
        flag: Flags.RO,
    },
    ESP: {
        code: 'ESP',
        name: 'Spain',
        flag: Flags.ES,
    },
    UKR: {
        code: 'UKR',
        name: 'Ukraine',
        flag: Flags.UA,
    },
    BRA: {
        code: 'BRA',
        name: 'Brazil',
        flag: Flags.BR,
    },
    HKG: {
        code: 'HKG',
        name: 'Hong Kong',
        flag: Flags.HK,
    },
    CHN: {
        code: 'CHN',
        name: 'China',
        flag: Flags.CN,
    },
    COL: {
        code: 'COL',
        name: 'Colombia',
        flag: Flags.CO,
    },
    MDA: {
        code: 'MDA',
        name: 'Moldova',
        flag: Flags.MD,
    },
    KAZ: {
        code: 'KAZ',
        name: 'Kazakhstan',
        flag: Flags.KZ,
    },
    ECU: {
        code: 'ECU',
        name: 'Ecuador',
        flag: Flags.EC,
    },
    KOR: {
        code: 'KOR',
        name: 'South Korea',
        flag: Flags.KR,
    },
    MEX: {
        code: 'MEX',
        name: 'Mexico',
        flag: Flags.MX,
    },
    SRB: {
        code: 'SRB',
        name: 'Serbia',
        flag: Flags.RS,
    },
    TUR: {
        code: 'TUR',
        name: 'Turkey',
        flag: Flags.TR,
    },
} as const;

// Helper to get array of all countries
export const countriesArray = Object.values(countries);

// Helper to get country codes
export const countryCodes = Object.keys(countries);

// Helper to get country by code
export const getCountryByCode = (code: string): Country | undefined => {
    return countries[code];
};

