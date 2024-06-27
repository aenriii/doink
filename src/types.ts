export type ConfigJSON = {
    port?: number;
    backupTime?: number;
    discord: ConfigDiscord;

    sourceRoots?: SourceRootManifest[];
    sourceRootOptions: SourceRootOptions;

}

export type ConfigDiscord = {
    token: string;
    ownerIds: number[];
    broadcastChannelId: number;
};

export type SourceRootManifest = {
    absPath: string;
    github: SourceRootGithubInfo,
    lastUpdatedAt: number;
}
export type SourceRootGithubInfo = {
    secret: string;
    repoName: string;
    repoOwner: string;
    filter: string;
}

export type SourceRootOptions = {
    createByRequest: boolean;
    dynamicCreateRepoOwners?: string[];
    createdSourceRoot?: string;
};