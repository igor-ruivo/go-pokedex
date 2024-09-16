import Dictionary from "../utils/Dictionary"

export interface ITranslatedMove {
    vId: string,
    name: string
}

export interface ITranslatedGruntPhrase {
    key: string,
    phrase: string
}

export interface ITranslatedGame {
    moves: Dictionary<ITranslatedMove>,
    rocketPhrases: Dictionary<ITranslatedGruntPhrase>
}