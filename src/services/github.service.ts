const MAX_GH_API_CONTENT_SIZE = 65534;
const CHARACTERS_BUFFER = 50;
export function isOverMaxCharacterLimitAPI(content: string):boolean {
    return content.length >= MAX_GH_API_CONTENT_SIZE - CHARACTERS_BUFFER;
}