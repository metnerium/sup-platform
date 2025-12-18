import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useNavigation} from '@react-navigation/native';
import {useStoryStore} from '@/store/storyStore';
import {useThemeStore} from '@/store/themeStore';
import {Avatar} from '@/components/common/Avatar';
import {Story} from '@/types';
import {formatStoryTime} from '@/utils/dateUtils';
import {spacing, typography, borderRadius} from '@/constants/theme';

const {width} = Dimensions.get('window');
const STORY_ITEM_SIZE = (width - spacing.lg * 3) / 3;

const StoryItem: React.FC<{story: Story; onPress: () => void}> = ({
  story,
  onPress,
}) => {
  const {colors} = useThemeStore();

  return (
    <TouchableOpacity style={styles.storyItem} onPress={onPress}>
      {story.type === 'image' || story.type === 'video' ? (
        <FastImage
          source={{uri: story.thumbnail || story.content}}
          style={styles.storyImage}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View
          style={[
            styles.storyImage,
            {backgroundColor: story.backgroundColor || colors.primary},
          ]}>
          <Text
            style={styles.storyTextContent}
            numberOfLines={3}>
            {story.content}
          </Text>
        </View>
      )}

      <View style={styles.storyInfo}>
        <Avatar
          uri={story.user.avatar}
          name={story.user.displayName}
          size="xs"
        />
        <Text style={[styles.storyUsername, {color: colors.text}]} numberOfLines={1}>
          {story.user.displayName}
        </Text>
        <Text style={[styles.storyTime, {color: colors.textTertiary}]}>
          {formatStoryTime(story.createdAt)}
        </Text>
      </View>

      {story.views.length > 0 && (
        <View style={[styles.viewCount, {backgroundColor: colors.overlay}]}>
          <Text style={styles.viewCountText}>{story.views.length} 👁</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const StoriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {colors} = useThemeStore();
  const {stories, loadStories, isLoading} = useStoryStore();

  useEffect(() => {
    loadStories();
  }, []);

  const handleRefresh = useCallback(() => {
    loadStories();
  }, []);

  const handleStoryPress = useCallback((story: Story) => {
    navigation.navigate('StoryViewer', {storyId: story.id});
  }, []);

  const handleCreateStory = useCallback(() => {
    navigation.navigate('CreateStory');
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.createStory, {backgroundColor: colors.surface}]}
        onPress={handleCreateStory}>
        <View style={[styles.createStoryIcon, {backgroundColor: colors.primary}]}>
          <Text style={styles.createStoryIconText}>+</Text>
        </View>
        <Text style={[styles.createStoryText, {color: colors.text}]}>
          Create Story
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = useCallback(
    ({item}: {item: Story}) => (
      <StoryItem story={item} onPress={() => handleStoryPress(item)} />
    ),
    [handleStoryPress],
  );

  const keyExtractor = useCallback((item: Story) => item.id, []);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <FlatList
        data={stories}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
              No stories available
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  createStory: {
    height: STORY_ITEM_SIZE,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  createStoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  createStoryIconText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
  },
  createStoryText: {
    ...typography.captionBold,
  },
  storyItem: {
    width: STORY_ITEM_SIZE,
    height: STORY_ITEM_SIZE * 1.5,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  storyTextContent: {
    color: '#FFFFFF',
    ...typography.body,
    textAlign: 'center',
  },
  storyInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  storyUsername: {
    ...typography.small,
    color: '#FFFFFF',
    marginTop: spacing.xs,
  },
  storyTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  viewCount: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  viewCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
  },
});
