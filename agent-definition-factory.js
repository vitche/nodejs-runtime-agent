module.exports = {
    fromParameters: function (token, interval, action) {
        var agentDefinition = {};
        agentDefinition.token = token;
        agentDefinition.interval = interval;
        agentDefinition.action = action;
        return agentDefinition;
    }
};