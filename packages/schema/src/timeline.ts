import { z } from "zod";

/**
 * Timeline Clip Base
 */
export const ClipBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  start: z.number(), // timeline start time in seconds
  duration: z.number(), // duration on timeline in seconds
  offset: z.number().default(0), // start offset in source media in seconds
  sourceDuration: z.number().optional(), // total source media duration in seconds
  color: z.string().optional(),
});

/**
 * Video Clip
 */
export const VideoClipSchema = ClipBaseSchema.extend({
  type: z.literal("video"),
  src: z.string(),
  volume: z.number().default(1.0),
  speed: z.number().default(1.0),
  thumbnail: z.string().optional(),
});
export type VideoClip = z.infer<typeof VideoClipSchema>;

/**
 * Audio Clip
 */
export const AudioClipSchema = ClipBaseSchema.extend({
  type: z.literal("audio"),
  src: z.string(),
  volume: z.number().default(1.0),
  fadeIn: z.number().default(0),
  fadeOut: z.number().default(0),
});
export type AudioClip = z.infer<typeof AudioClipSchema>;

/**
 * Graphics Overlay Clip (OGraf Template embedded on timeline)
 */
export const GraphicsOverlayClipSchema = ClipBaseSchema.extend({
  type: z.literal("graphics"),
  templateId: z.string(),
  data: z.record(z.any()).default({}),
  inDuration: z.number().default(0.5),
  outDuration: z.number().default(0.4),
});
export type GraphicsOverlayClip = z.infer<typeof GraphicsOverlayClipSchema>;

export type TimelineClip = VideoClip | AudioClip | GraphicsOverlayClip;

/**
 * Timeline Track
 */
export const TrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["video", "audio", "graphics"]),
  muted: z.boolean().default(false),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  zIndex: z.number().default(1),
  clips: z.array(z.union([VideoClipSchema, AudioClipSchema, GraphicsOverlayClipSchema])),
});
export type Track = z.infer<typeof TrackSchema>;

/**
 * Timeline Project (EDL)
 */
export const TimelineProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().default(1920),
  height: z.number().default(1080),
  fps: z.number().default(50),
  duration: z.number().default(60), // max duration in seconds
  tracks: z.array(TrackSchema).default([]),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});
export type TimelineProject = z.infer<typeof TimelineProjectSchema>;
