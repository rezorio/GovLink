export type Locale = 'en' | 'tl';

export type MessageTree = {
    [key: string]: string | MessageTree;
};
