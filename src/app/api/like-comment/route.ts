import { type NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { getAuthenticatedUserId } from "@/helpers/auth/user";
import { prisma } from "@/lib/prisma";

// Constants
const ENGAGEMENT_SCORES = {
  COMMENT_LIKE: 1,
} as const;

interface LikeCommentRequest {
  commentId: string;
}

interface LikeCommentResponse {
  liked: boolean;
  likeCount: number;
}

/**
 * Toggle the authenticated user's like on a comment and return the updated like state and total like count.
 *
 * Performs validation and authentication, creates or removes the user's comment like, adjusts the parent post's engagement score,
 * and creates a notification for the comment author when a new like is added.
 *
 * @returns An object with `liked` (`true` if the user now likes the comment, `false` otherwise) and `likeCount` (the comment's total number of likes).
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate input
    const { commentId } = (await req.json()) as LikeCommentRequest;
    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    // 2. Authenticate user
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 3. Use transaction for atomicity
    const result: LikeCommentResponse = await prisma.$transaction(
      async (tx) => {
        // Verify comment exists
        const comment = await tx.comment.findUnique({
          where: { id: commentId },
        });

        if (!comment) {
          throw new Error("COMMENT_NOT_FOUND");
        }

        // Check if user already liked the comment
        const existingLike = await tx.commentLike.findUnique({
          where: { commentId_userId: { commentId, userId } },
        });

        let liked: boolean;

        if (existingLike) {
          // Unlike the comment
          await tx.commentLike.delete({
            where: { commentId_userId: { commentId, userId } },
          });

          await tx.post.update({
            where: { id: comment.postId },
            data: {
              engagementScore: {
                decrement: ENGAGEMENT_SCORES.COMMENT_LIKE,
              },
            },
          });

          liked = false;
        } else {
          // Like the comment
          await tx.commentLike.create({
            data: { commentId, userId },
          });

          await tx.post.update({
            where: { id: comment.postId },
            data: {
              engagementScore: {
                increment: ENGAGEMENT_SCORES.COMMENT_LIKE,
              },
            },
          });

          // Create notification if not self-like
          if (comment.authorId !== userId) {
            await tx.notification.create({
              data: {
                userId: comment.authorId,
                message: "Your comment received a new like.",
                type: "COMMENT_LIKE",
                commentId: comment.id,
                actorId: userId,
              },
            });
          }

          liked = true;
        }

        // Get updated like count
        const likeCount = await tx.commentLike.count({
          where: { commentId },
        });

        return { liked, likeCount };
      }
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "COMMENT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Comment or post not found" },
          { status: 404 }
        );
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Invalid comment or user reference" },
          { status: 400 }
        );
      }
    }

    console.error("Comment like error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
