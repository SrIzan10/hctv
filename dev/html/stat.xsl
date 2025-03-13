<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8" media-type="application/json"/>
  <xsl:template match="/">
    <xsl:text>{</xsl:text>
    <xsl:text>"server": {</xsl:text>
    <xsl:text>"version": "</xsl:text><xsl:value-of select="rtmp/nginx_version"/><xsl:text>",</xsl:text>
    <xsl:text>"uptime": "</xsl:text><xsl:value-of select="rtmp/server/uptime"/><xsl:text>",</xsl:text>
    <xsl:text>"applications": [</xsl:text>
    <xsl:for-each select="rtmp/server/application">
      <xsl:if test="position() > 1">,</xsl:if>
      <xsl:text>{</xsl:text>
      <xsl:text>"name": "</xsl:text><xsl:value-of select="name"/><xsl:text>",</xsl:text>
      <xsl:text>"streams": [</xsl:text>
      <xsl:for-each select="live/stream">
        <xsl:if test="position() > 1">,</xsl:if>
        <xsl:text>{</xsl:text>
        <xsl:text>"name": "</xsl:text><xsl:value-of select="name"/><xsl:text>",</xsl:text>
        <xsl:text>"time": "</xsl:text><xsl:value-of select="time"/><xsl:text>",</xsl:text>
        <xsl:text>"bw_in": "</xsl:text><xsl:value-of select="bw_in"/><xsl:text>",</xsl:text>
        <xsl:text>"bw_out": "</xsl:text><xsl:value-of select="bw_out"/><xsl:text>",</xsl:text>
        <xsl:text>"bytes_in": "</xsl:text><xsl:value-of select="bytes_in"/><xsl:text>",</xsl:text>
        <xsl:text>"bytes_out": "</xsl:text><xsl:value-of select="bytes_out"/><xsl:text>",</xsl:text>
        <xsl:text>"nclients": "</xsl:text><xsl:value-of select="nclients"/><xsl:text>",</xsl:text>
        <xsl:text>"publishing": </xsl:text>
        <xsl:choose>
          <xsl:when test="count(client[publishing]) > 0">true</xsl:when>
          <xsl:otherwise>false</xsl:otherwise>
        </xsl:choose>
        <xsl:text>,</xsl:text>
        <xsl:text>"active": </xsl:text>
        <xsl:choose>
          <xsl:when test="active = 1">true</xsl:when>
          <xsl:otherwise>false</xsl:otherwise>
        </xsl:choose>
        <xsl:text>,</xsl:text>
        <xsl:text>"clients": [</xsl:text>
        <xsl:for-each select="client">
          <xsl:if test="position() > 1">,</xsl:if>
          <xsl:text>{</xsl:text>
          <xsl:text>"id": "</xsl:text><xsl:value-of select="id"/><xsl:text>",</xsl:text>
          <xsl:text>"address": "</xsl:text><xsl:value-of select="address"/><xsl:text>",</xsl:text>
          <xsl:text>"time": "</xsl:text><xsl:value-of select="time"/><xsl:text>",</xsl:text>
          <xsl:text>"flashver": "</xsl:text><xsl:value-of select="flashver"/><xsl:text>",</xsl:text>
          <xsl:text>"publishing": </xsl:text>
          <xsl:choose>
            <xsl:when test="publishing">true</xsl:when>
            <xsl:otherwise>false</xsl:otherwise>
          </xsl:choose>
          <xsl:text>}</xsl:text>
        </xsl:for-each>
        <xsl:text>]</xsl:text>
        <xsl:text>}</xsl:text>
      </xsl:for-each>
      <xsl:text>]</xsl:text>
      <xsl:text>}</xsl:text>
    </xsl:for-each>
    <xsl:text>]</xsl:text>
    <xsl:text>}</xsl:text>
    <xsl:text>}</xsl:text>
  </xsl:template>
</xsl:stylesheet>